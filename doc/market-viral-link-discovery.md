# 市场品类爆款链接采集与排序

## 1. All-IN-ONE 实际做了什么

[All-IN-ONE](https://github.com/cv-cat/All-IN-ONE) 是一个统一 CLI/Agent Skill，不是完整的榜单服务。

- `all_in_one/platforms/invoke.py` 动态加载三个上游仓库的方法。
- `skills/all-in-one/references/douyin.md` 和 `references/xhs.md` 只是命令说明。
- 实际抓取逻辑在上游 `DouYin_Spider` 与 `Spider_XHS` 中。
- 项目没有“爆款评分”“品类榜单”或“多品横测识别”实现；这些都需要调用方搜索、补全字段、过滤并排序。

本项目因此在 `workflow-runner` 中增加了独立的
`market.category-viral-search` Skill，并在 All-IN-ONE 之上增加单品种草规则。
Spring Boot 只负责鉴权、异步任务和缓存榜，不直接执行采集命令。

## 2. 两个平台的搜索差异

### 抖音

上游搜索接口为 `/aweme/v1/web/general/search/single/`，在一次请求中支持：

- `sort_type=1`：最多点赞。
- `content_type=1`：只看视频。
- 搜索关键字来自品类名及“品类 + 测评”等扩展词。

返回作品里可直接读取 `aweme_id`、`desc`、`statistics.digg_count`、`video.duration`、
`author.nickname`、封面与发布时间。

### 小红书

上游搜索接口为 `/api/sns/web/v2/search/notes`，对应参数是：

- `sort=popularity_descending`：热度优先，不是点赞数精确排序。
- `note_type=1`：只看视频笔记。

搜索结果中的互动数通常是 `1.2万` 这类展示文本，需要转成数值。精确时长不参与筛选，
本实现只对前若干条调用笔记详情补全元数据，最后统一按点赞数做本地排序。

## 3. 本项目的处理链路

```text
用户输入品类
  -> 创建 market_viral_refresh 异步任务
  -> Spring 内部调用 Python Skill
  -> Python market.category-viral-search 执行 AIONE 搜索
  -> 平台字段标准化、ID 去重、万/亿互动数转换
  -> 小红书详情补全候选元数据
  -> 单品测评复筛
  -> 入库并更新 last_seen_at
  -> 按 like_count DESC 查询
  -> 市场页展示，可复制链接或带入爆款复刻
```

用户端 `/market` 是功能市场首页，只展示 `sys_market_function` 中状态为已上架的功能。
点击功能卡片后进入对应入口，例如品类爆款链接的详情页为
`/market/category-viral-links`。后台“市场功能管理”可新增、编辑、排序、上下架和删除功能。

单品复筛目前使用标题和标签规则：

- 不限制视频时长；搜索结果中包含长视频和无法解析时长的视频。
- 标题或标签必须明确出现目标品类，例如油烟机、抽油烟机、吸油烟机。
- 剔除“横评、横测、多款、N 款、对比、排行榜、合集、怎么选、哪个好”等信号。
- 剔除“全屋家电、厨房好物、多个品类、顺带推荐、好物清单”等跨品类信号。
- 同一内容出现油烟机、燃气灶、洗碗机等多个明确品类时剔除。

这套规则是保守预筛，不能识别“标题很干净但画面实际在横测”的视频。若要把“多品横测”的召回和精度继续提高，应增加：

1. 首帧/关键帧 OCR 与多品检测。
2. 视频画面、标题、评论的联合分类模型。
3. 人工抽样标注集，持续评估 precision/recall。

项目当前只保存公开元数据和源链接，不下载或转存原视频。

## 4. 本地启用 All-IN-ONE

All-IN-ONE 依赖登录态 Cookie 和上游签名实现。它运行在
`workflow-runner` 的 Python Skill 进程中，不放进主业务 JVM。

```bash
pip install -e /path/to/All-IN-ONE
aione setup --upstream-root /path/to/aione-upstreams
```

Cookie **不写入** `.env`，也不使用 `aione auth set-cookie`。在后台
「市场采集」页面分别填写抖音和小红书 Cookie、提醒手机号。Cookie 和手机号
使用 `APP_SECRET_CIPHER_KEY` 对应的 AES-GCM 密钥加密保存。

Python Skill 执行时会使用 `WORKFLOW_PROVIDER_GATEWAY_TOKEN` 调用 Spring 内部接口，
临时获取解密后的 Cookie；Cookie 不进入 Redis、任务结果或 AIONE 命令行参数。

Python 服务配置（`workflow-runner/.env`）：

```yaml
WORKFLOW_PROVIDER_GATEWAY_TOKEN=<same-token-as-spring>
WORKFLOW_MARKET_CREDENTIAL_URL=http://127.0.0.1:8080/api/internal/workflow/providers/market-source-credential
WORKFLOW_AIONE_COMMAND=aione
WORKFLOW_AIONE_TIMEOUT_SECONDS=180
WORKFLOW_MARKET_VIRAL_MAX_CANDIDATES=40
WORKFLOW_MARKET_VIRAL_XHS_DETAIL_LIMIT=20
```

Spring Boot 使用同一令牌调用 Python 内部 Skill：

```bash
export WORKFLOW_PROVIDER_GATEWAY_TOKEN="<same-token-as-spring>"
export MARKET_VIRAL_SKILL_URL="http://127.0.0.1:8091/api/internal/skills/market-category-viral-search/execute"
```

如果 `aione` 不在 Python 服务的 `PATH` 中，将 `WORKFLOW_AIONE_COMMAND` 设置为绝对路径。
Skill 注册码为 `market.category-viral-search`，也可以作为画布节点的 `skillCode` 直接使用。

### 后台获取 Cookie

获取方式参考上游 [DouYin_Spider](https://github.com/cv-cat/DouYin_Spider) 与
[Spider_XHS](https://github.com/cv-cat/Spider_XHS)，统一从桌面 Chrome 中真实登录后的
请求头复制完整 Cookie。管理后台「市场采集」页面的每个平台卡片都提供“获取说明”入口。

抖音：

1. 使用桌面 Chrome 登录 `https://www.douyin.com/`。
2. 按 F12，打开 Network -> Fetch/XHR，刷新页面或搜索一次品类。
3. 找到包含 `/aweme/v1/web/` 的请求。
4. 在 Request Headers 中复制完整 Cookie，通常应包含 `UIFID`。
5. 回到后台粘贴、保存并点击“检测 Cookie”。

小红书：

1. 使用桌面 Chrome 登录 `https://www.xiaohongshu.com/`。
2. 按 F12，打开 Network -> Fetch/XHR，刷新页面或搜索一次品类。
3. 找到包含 `/api/sns/web/` 的请求。
4. 在 Request Headers 中复制完整 Cookie，必须包含服务端签发的 `web_session`。
5. 回到后台粘贴、保存并点击“检测 Cookie”。

Cookie 过期后必须重新登录并替换完整值，不要只修改 `UIFID`、`a1`、`web_id`
等局部字段。Cookie 属于登录凭证，不得截图、转发或写入 `.env`；只应粘贴到后台加密输入框。
建议为采集任务使用独立平台账号。

## 5. API

查询缓存榜：

```http
GET /api/market/viral-videos?page=1&pageSize=20&category=油烟机&platform=douyin
```

创建异步采集：

```http
POST /api/market/viral-videos/refresh
Content-Type: application/json

{
  "category": "油烟机",
  "platforms": ["douyin", "xiaohongshu"],
  "requestNo": "前端幂等请求号"
}
```

返回的 `taskId` 使用现有 `GET /api/tasks/{id}` 查询进度。成功结果包含采集数、过滤数、原因分布和平台警告。

Spring 与 Python 之间的内部接口为：

```http
POST /api/internal/skills/market-category-viral-search/execute
X-Workflow-Token: <WORKFLOW_PROVIDER_GATEWAY_TOKEN>
```

该接口不是用户 API，不应暴露到公网。

## 6. Cookie 过期提醒

后台每 6 小时自动检测一次 Cookie，默认 Cron 为：

```text
0 10 */6 * * ?
```

- 连续失败 1 次：标记为“校验异常”，不发送短信。
- 连续失败 2 次：标记为“疑似已过期”，向对应平台配置的手机号发送短信。
- 提醒后 24 小时内不重复发送；Cookie 恢复有效后自动重置提醒状态。
- Python/Spring 网络故障不算 Cookie 失效，不会触发过期短信。

短信使用阿里云普通短信接口，需要在 Spring 运行环境配置：

```bash
SMS_ENABLED=true
SMS_ACCESS_KEY_ID=<access-key-id>
SMS_ACCESS_KEY_SECRET=<access-key-secret>
SMS_SIGN_NAME=<approved-sign-name>
SMS_MARKET_COOKIE_TEMPLATE_CODE=<approved-template-code>
```

短信模板至少包含一个变量 `platform`，例如：

```text
{{platform}}市场采集Cookie可能已过期，请登录管理后台更新。
```

提醒手机号不是服务配置，存放在后台数据库中并加密保存。

## 7. 生产建议

- 优先采购有授权的数据服务，将 `ViralSearchClient` 换为 Provider 实现。
- Cookie 只允许以加密形式进入后台数据库；日志、任务结果和前端只能出现“已配置/未配置”。
- 设置平台级限速与失败退避，避免搜索会话被风控。
- 抓取失败时保留近期缓存，不因一次平台异常清空榜单。
- 采集只用于结构研究和链接推荐，后续脚本生成仍要执行原创度与合规检查。
