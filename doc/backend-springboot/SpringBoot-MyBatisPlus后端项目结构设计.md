# AI Script Spring Boot + MyBatis-Plus 后端项目结构设计

## 1. 后端技术选型

按当前前台、后台代码和商业短视频脚本生成平台的业务复杂度，后端建议使用单体分层架构起步，后续按模块拆微服务。

| 分类 | 技术 | 用途 |
| --- | --- | --- |
| 基础框架 | Spring Boot 3.x | 后端主框架。 |
| JDK | Java 17 | Spring Boot 3 推荐版本，长期维护稳定。 |
| ORM | MyBatis-Plus 3.5.x | CRUD、分页、逻辑删除、自动填充、自增 ID。 |
| 数据库 | MySQL 8.0 | 主业务库，方便部署和团队维护。 |
| 缓存 | Redis | 登录 token、验证码、任务进度、热点配置缓存。 |
| 安全 | Spring Security + JWT | 前台用户、后台管理员统一登录鉴权。 |
| 接口文档 | springdoc-openapi | 自动生成 Swagger/OpenAPI 文档。 |
| 文件存储 | MinIO / 阿里云 OSS / 腾讯云 COS | 图片、音频、视频、导出文件。 |
| 异步任务 | Spring Task + ThreadPoolTaskExecutor | MVP 支撑 AI 生成、导出、解析任务。 |
| 高阶队列 | RabbitMQ / RocketMQ 可选 | 后续视频生成、支付回调、AI 任务量变大时接入。 |
| 参数校验 | Hibernate Validator | 请求 DTO 字段校验。 |
| JSON | Jackson | JSON 序列化。 |
| Excel | EasyExcel | 卖点模板导入导出、脚本导出。 |
| PDF | OpenPDF / iText 可选 | 分镜脚本 PDF 导出。 |
| 日志 | Logback + MDC | 请求链路日志、用户/租户上下文。 |
| 监控 | Spring Boot Actuator | 健康检查和运行状态。 |

## 2. 当前前端反推的业务模块

### 2.1 用户端 front-web

现有用户端接口集中在：

| 前端文件 | 后端模块 | 主要能力 |
| --- | --- | --- |
| `src/api/auth.ts` | 认证模块 | 登录、注册、退出、验证码、用户信息。 |
| `src/api/project.ts` | 项目模块 | 项目列表、详情、新建、更新、删除。 |
| `src/api/brief.ts` | Brief/卖点模块 | Brief 列表、详情、新建、更新、删除、导入。 |
| `src/api/script.ts` | 脚本模块 | 脚本列表、详情、生成、更新、删除、模板列表。 |
| `src/api/storyboard.ts` | 分镜模块 | 根据脚本查询分镜、更新分镜、导出。 |
| 会员/充值弹窗 | 会员支付模块 | 会员套餐、余额充值、余额支付。 |
| 工作台 | 工作流模块 | 产品卖点、脚本生成、分镜、视觉、视频、预览。 |

### 2.2 管理端 admin-web

现有管理端接口集中在：

| 前端文件 | 后端模块 | 主要能力 |
| --- | --- | --- |
| `src/api/auth.ts` | 后台认证 | 管理员登录、退出、管理员信息。 |
| `src/api/user.ts` | 用户管理 | 用户列表、详情、更新、启用/禁用。 |
| `src/api/project.ts` | 项目管理 | 项目列表、详情、删除。 |
| `src/api/template.ts` | 模板管理 | 模板列表、详情、新建、更新、删除。 |
| 页面静态区 | 后台运营 | 看板、脚本管理、系统设置。 |

## 3. 推荐后端项目结构

建议在仓库根目录新增生产后端工程：

```text
server/
  pom.xml
  README.md
  Dockerfile
  src/
    main/
      java/
        com/aiscript/
          AiScriptApplication.java
          common/
          config/
          security/
          framework/
          modules/
          integration/
          task/
      resources/
        application.yml
        application-dev.yml
        application-prod.yml
        mapper/
        static/
        templates/
    test/
      java/
        com/aiscript/
```

### 3.1 根目录文件

| 路径 | 用途 |
| --- | --- |
| `server/pom.xml` | Maven 依赖管理，定义 Spring Boot、MyBatis-Plus、Redis、JWT、EasyExcel 等依赖。 |
| `server/README.md` | 后端启动方式、环境变量、数据库初始化、接口文档地址。 |
| `server/Dockerfile` | 后端容器镜像构建。 |

### 3.2 Java 主包结构

```text
com/aiscript/
  AiScriptApplication.java
  common/
    api/
    constant/
    enums/
    exception/
    model/
    pagination/
    util/
  config/
    MybatisPlusConfig.java
    RedisConfig.java
    WebMvcConfig.java
    JacksonConfig.java
    ThreadPoolConfig.java
    OpenApiConfig.java
  security/
    JwtTokenProvider.java
    JwtAuthenticationFilter.java
    SecurityConfig.java
    LoginUser.java
    PermissionService.java
  framework/
    tenant/
    audit/
    fill/
    log/
    storage/
  modules/
    auth/
    user/
    tenant/
    project/
    brief/
    asset/
    source/
    script/
    storyboard/
    compliance/
    auditflow/
    generation/
    membership/
    payment/
    admin/
    analytics/
    system/
    notification/
  integration/
    llm/
    parser/
    asr/
    video/
    tts/
    pay/
    oss/
  task/
    generation/
    export/
    parser/
```

### 3.3 `common/` 公共基础层

```text
common/
  api/
    Result.java
    ResultCode.java
    PageResult.java
  constant/
    CacheKeys.java
    SecurityConstants.java
  enums/
    UserTypeEnum.java
    StatusEnum.java
    ProjectStatusEnum.java
    ScriptTypeEnum.java
    ScriptStatusEnum.java
    TaskStatusEnum.java
    PayStatusEnum.java
  exception/
    BusinessException.java
    GlobalExceptionHandler.java
  model/
    BaseEntity.java
    TenantBaseEntity.java
  pagination/
    PageQuery.java
    PageResult.java
  util/
    JsonUtils.java
    IdUtils.java
    DateTimeUtils.java
    MaskUtils.java
```

| 文件夹 | 作用 |
| --- | --- |
| `api/` | 统一响应对象、分页响应、错误码，例如 `R<T>`、`PageResult<T>`。 |
| `constant/` | 缓存 key、请求头、系统常量。 |
| `enums/` | 所有状态枚举，避免魔法字符串散落业务代码。 |
| `exception/` | 业务异常和全局异常处理。 |
| `model/` | 所有实体公共字段，如 `id`、`createTime`、`updateTime`、`deleted`。 |
| `pagination/` | 分页请求和分页响应。 |
| `util/` | JSON、脱敏、时间、ID 等工具类。 |

### 3.4 `config/` 框架配置层

| 文件 | 作用 |
| --- | --- |
| `MybatisPlusConfig.java` | 分页插件、乐观锁、逻辑删除、租户拦截器配置。 |
| `RedisConfig.java` | RedisTemplate 序列化配置。 |
| `WebMvcConfig.java` | 跨域、静态资源、拦截器配置。 |
| `JacksonConfig.java` | 时间格式、Long 转字符串，防止前端 JS 精度丢失。 |
| `ThreadPoolConfig.java` | AI 任务、导出任务线程池。 |
| `OpenApiConfig.java` | Swagger 文档分组，区分用户端和管理端。 |

### 3.5 `security/` 登录鉴权层

| 文件 | 作用 |
| --- | --- |
| `JwtTokenProvider.java` | 生成和解析 JWT。 |
| `JwtAuthenticationFilter.java` | 从请求头读取 token，设置当前登录用户。 |
| `SecurityConfig.java` | 登录白名单、接口权限、密码加密配置。 |
| `LoginUser.java` | 当前登录用户上下文，包含 `userId`、`tenantId`、`userType`、权限列表。 |
| `PermissionService.java` | 后台按钮/菜单/接口权限判断。 |

### 3.6 `framework/` 横切能力层

```text
framework/
  tenant/
    TenantContext.java
    TenantInterceptor.java
  audit/
    OperationLogAspect.java
    OperationLogService.java
  fill/
    MybatisMetaObjectHandler.java
  log/
    RequestLogFilter.java
  storage/
    StorageClient.java
    StorageProperties.java
```

| 文件夹 | 作用 |
| --- | --- |
| `tenant/` | 多租户上下文，从登录用户或请求头获取 `tenantId`，自动过滤租户数据。 |
| `audit/` | 操作日志 AOP，记录后台关键操作。 |
| `fill/` | MyBatis-Plus 自动填充创建时间、更新时间、创建人等。 |
| `log/` | 请求日志、traceId、MDC。 |
| `storage/` | 文件存储统一接口，底层可接 MinIO/OSS/COS。 |

## 4. 业务模块内部结构

每个业务模块使用同一种目录风格，方便团队协作。

```text
modules/project/
  controller/
    ProjectController.java
    AdminProjectController.java
  service/
    ProjectService.java
  service/impl/
    ProjectServiceImpl.java
  mapper/
    ProjectMapper.java
  entity/
    Project.java
    ProjectStep.java
  dto/
    ProjectCreateDTO.java
    ProjectUpdateDTO.java
    ProjectQueryDTO.java
  vo/
    ProjectVO.java
    ProjectDetailVO.java
  convert/
    ProjectConvert.java
```

| 文件夹 | 作用 |
| --- | --- |
| `controller/` | HTTP 接口入口。用户端接口和后台接口分开，例如 `ProjectController`、`AdminProjectController`。 |
| `service/` | 业务接口，定义模块能力。 |
| `service/impl/` | 业务实现，处理事务、权限、状态流转。 |
| `mapper/` | MyBatis-Plus Mapper 接口。简单 CRUD 走 BaseMapper，复杂查询配 XML。 |
| `entity/` | 数据库实体，一张表一个实体。 |
| `dto/` | 请求入参对象，Controller 接收 DTO。 |
| `vo/` | 响应对象，返回给前端。 |
| `convert/` | Entity、DTO、VO 转换，可用 MapStruct 或手写。 |

## 5. 推荐业务模块说明

### 5.1 `auth/` 认证模块

负责前台用户和后台管理员登录。

```text
modules/auth/
  controller/AuthController.java
  controller/AdminAuthController.java
  service/AuthService.java
  dto/LoginDTO.java
  dto/RegisterDTO.java
  dto/SendCodeDTO.java
  vo/LoginVO.java
  vo/UserInfoVO.java
```

对应前端：

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/send-code`
- `GET /api/auth/user-info`
- `POST /api/admin/auth/login`
- `GET /api/admin/auth/admin-info`

### 5.2 `user/` 用户模块

负责用户资料、后台用户管理、启用/禁用。

核心表：

- `sys_user`
- `sys_role`
- `sys_user_role`

对应后台：

- `GET /api/admin/users`
- `GET /api/admin/users/{id}`
- `PUT /api/admin/users/{id}`
- `POST /api/admin/users/{id}/disable`
- `POST /api/admin/users/{id}/enable`

### 5.3 `tenant/` 租户模块

为后续品牌客户隔离预留。MVP 可以只有一个默认租户，但表结构必须保留 `tenant_id`。

核心表：

- `sys_tenant`

### 5.4 `project/` 项目与工作流模块

负责用户项目、项目步骤、项目进度。

核心表：

- `ai_project`
- `ai_project_step`

对应前台：

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{id}`
- `PUT /api/projects/{id}`
- `DELETE /api/projects/{id}`

### 5.5 `brief/` 产品 Brief 和卖点模块

负责产品 Brief、卖点保存、版本、导入、AI 评分结果。

核心表：

- `ai_brief`
- `ai_brief_version`
- `ai_selling_point`
- `ai_brief_ai_result`

对应前台：

- `GET /api/briefs?projectId=`
- `POST /api/briefs`
- `PUT /api/briefs/{id}`
- `DELETE /api/briefs/{id}`
- `POST /api/briefs/import`
- `POST /api/briefs/{id}/score`
- `POST /api/briefs/compare`

### 5.6 `asset/` 资产库和素材模块

负责我的卖点资产库、爆款脚本资产库、图片/视频/音频素材。

核心表：

- `ai_selling_point_asset`
- `ai_selling_point_asset_item`
- `ai_viral_asset`
- `ai_asset`
- `ai_asset_tag`
- `ai_asset_tag_rel`

### 5.7 `source/` 爆款链接解析模块

负责分享链接解析、ASR 文案提取、拉片报告、结构公式。

核心表：

- `ai_source_analysis`
- `ai_source_report`
- `ai_structure_formula`
- `sys_api_provider_config`

### 5.8 `script/` 脚本模块

负责脚本生成、脚本模板、脚本版本。

核心表：

- `ai_script_template`
- `ai_storyboard_script`
- `ai_script_version`
- `ai_storyboard_shot`

对应前台：

- `GET /api/scripts`
- `POST /api/scripts/generate`
- `PUT /api/scripts/{id}`
- `DELETE /api/scripts/{id}`
- `GET /api/scripts/templates`

对应后台：

- `GET /api/admin/scripts`
- `GET /api/admin/templates`
- `POST /api/admin/templates`
- `PUT /api/admin/templates/{id}`
- `DELETE /api/admin/templates/{id}`

### 5.9 `storyboard/` 分镜模块

负责分镜查询、编辑、导出。

对应前台：

- `GET /api/storyboards?scriptId=`
- `GET /api/storyboards/{id}`
- `PUT /api/storyboards/{id}`
- `GET /api/storyboards/{id}/export`

### 5.10 `compliance/` 合规模块

负责违禁词、合规检测、原创度检测。

核心表：

- `ai_compliance_word`
- `ai_compliance_check`
- `ai_originality_check`

### 5.11 `auditflow/` 审核流模块

负责脚本提交审核、审核任务、审核记录。

核心表：

- `ai_audit_task`
- `ai_audit_record`
- `ai_audit_rule`

### 5.12 `generation/` AI 任务模块

统一管理 AI 生成、链接解析、视频生成、配音、导出任务。

核心表：

- `ai_generation_task`
- `ai_video_segment`
- `ai_export_job`

### 5.13 `membership/` 和 `payment/` 会员支付模块

负责会员套餐、用户会员、余额充值、余额支付、额度。

核心表：

- `ai_membership_plan`
- `ai_user_membership`
- `ai_wallet_account`
- `ai_wallet_transaction`
- `ai_payment_order`
- `ai_payment_callback`
- `ai_quota_account`
- `ai_quota_transaction`

### 5.14 `system/` 系统配置模块

负责 Provider 配置、Prompt 模板、导入模板配置、操作日志、菜单权限。

核心表：

- `sys_api_provider_config`
- `sys_prompt_template`
- `sys_import_template_config`
- `sys_operation_log`
- `sys_permission`
- `sys_role`

### 5.15 `analytics/` 投放数据模块

负责投放监测链接、投放指标、A/B 测试、报表导出。

核心表：

- `ai_monitor_link`
- `ai_analytics_metric`
- `ai_ab_test`
- `ai_ab_test_variant`

## 6. resources 目录结构

```text
resources/
  application.yml
  application-dev.yml
  application-prod.yml
  mapper/
    user/
      UserMapper.xml
    project/
      ProjectMapper.xml
    script/
      ScriptMapper.xml
  static/
  templates/
    excel/
      selling-point-template.xlsx
```

| 文件夹 | 作用 |
| --- | --- |
| `application.yml` | 公共配置。 |
| `application-dev.yml` | 本地开发配置，MySQL、Redis、MinIO 地址。 |
| `application-prod.yml` | 生产配置，通过环境变量注入密钥。 |
| `mapper/` | MyBatis XML，只有复杂 SQL 需要写 XML。 |
| `templates/excel/` | Excel 导入导出模板。 |

## 7. 包命名和接口命名建议

### 7.1 Controller 命名

- 用户端接口：`ProjectController`，路径 `/api/projects`
- 管理端接口：`AdminProjectController`，路径 `/api/admin/projects`
- 不建议所有接口都塞到一个 Controller。

### 7.2 DTO/VO 命名

- 创建请求：`ProjectCreateDTO`
- 更新请求：`ProjectUpdateDTO`
- 查询请求：`ProjectQueryDTO`
- 列表响应：`ProjectVO`
- 详情响应：`ProjectDetailVO`

### 7.3 Entity 命名

数据库表使用下划线，Java 实体使用 PascalCase：

| 表名 | Entity |
| --- | --- |
| `sys_user` | `SysUser` |
| `ai_project` | `AiProject` |
| `ai_brief` | `AiBrief` |
| `ai_storyboard_script` | `AiStoryboardScript` |
| `ai_storyboard_shot` | `AiStoryboardShot` |

## 8. 前后端统一接口返回格式

### 8.1 普通响应

除文件下载外，所有接口统一返回：

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "traceId": "请求链路ID",
  "timestamp": 1710000000000
}
```

后端建议定义：

```java
public class R<T> {
    private Integer code;
    private String message;
    private T data;
    private String traceId;
    private Long timestamp;
}
```

约定：

- `code = 0` 表示成功。
- `code != 0` 表示业务失败或系统异常。
- `message` 用于前端提示和排查。
- `traceId` 必须写入日志 MDC，方便按请求链路排查问题。
- Controller 不直接拼 Map，必须使用统一响应类。

### 8.2 分页响应

分页接口统一返回：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [],
    "total": 0,
    "page": 1,
    "pageSize": 10,
    "pages": 0
  },
  "traceId": "请求链路ID",
  "timestamp": 1710000000000
}
```

后端建议定义：

```java
public class PageResult<T> {
    private List<T> list;
    private Long total;
    private Long page;
    private Long pageSize;
    private Long pages;
}
```

### 8.3 错误码

| 错误码 | 含义 |
| --- | --- |
| `0` | 成功 |
| `40000` | 请求参数错误 |
| `40001` | 业务校验失败 |
| `40100` | 未登录或 Token 无效 |
| `40300` | 无权限 |
| `40400` | 资源不存在 |
| `40900` | 数据状态冲突 |
| `42900` | 请求过于频繁 |
| `50000` | 系统异常 |
| `50010` | 第三方 Provider 调用失败 |

### 8.4 文件下载响应

脚本导出、视频导出、报表导出直接返回文件流，不包统一 JSON。导出失败时仍返回统一 JSON 错误结构。

### 8.5 前端解包约定

前端 axios 实例统一解包：

- HTTP 非 `2xx` 统一进入异常处理。
- HTTP 成功但 `code !== 0` 时抛出业务错误。
- 成功时只向页面层返回 `data`。
- `40100` 时清理 token 并跳转登录页。
- 前端 ID 类型统一为 `string`，后端 Long ID 返回时必须序列化为字符串。

## 9. MyBatis-Plus 约定

### 9.1 主键策略

所有主键用 `INT AUTO_INCREMENT`，Java 中用 `Integer`，MyBatis-Plus 使用：

```java
@TableId(type = IdType.AUTO)
private Integer id;
```

前端返回 Integer ID 时可直接按数字处理：

```java
private Integer id;
```

### 9.2 公共字段

所有业务表建议包含：

```text
id
tenant_id
create_by
create_time
update_by
update_time
deleted
```

系统字典、权限等全局表可以不带 `tenant_id`。

### 9.3 逻辑删除

使用 `deleted TINYINT DEFAULT 0`。

MyBatis-Plus 配置：

```yaml
mybatis-plus:
  global-config:
    db-config:
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0
```

### 9.4 自动填充

`createTime`、`updateTime`、`createBy`、`updateBy` 通过 `MetaObjectHandler` 自动填充。

## 10. 数据库文件位置

MySQL 全局建库文件单独放在：

```text
doc/global-database/mysql/ai_script_mysql_schema.sql
```

MySQL 全局初始化数据文件单独放在：

```text
doc/global-database/mysql/ai_script_mysql_seed.sql
```

建库文件包含：

- `CREATE DATABASE ai_script`
- 所有系统表 `sys_*`
- 所有业务表 `ai_*`
- 核心索引

初始化数据文件包含：

- 默认租户、超级管理员、演示用户
- 默认角色、菜单权限、常用 API 权限
- 角色权限和用户角色关系
- 会员套餐、脚本模板、Prompt 模板、导入模板示例

执行顺序：先执行 `ai_script_mysql_schema.sql`，再执行 `ai_script_mysql_seed.sql`。

## 11. 推荐开发顺序

1. 初始化 `server/` Spring Boot 工程。
2. 接入 MySQL、MyBatis-Plus、Redis、Swagger。
3. 实现统一响应、异常处理、JWT 登录。
4. 实现前台现有接口：认证、项目、Brief、脚本、分镜。
5. 实现后台现有接口：管理员登录、用户、项目、模板。
6. 接入文件上传和 Excel 导入。
7. 实现 AI 任务表和异步任务框架，先 mock 生成，再接真实 Provider。
8. 实现会员、充值、余额、额度。
9. 实现审核、合规、原创度检测。
10. 实现视频、配音、导出、投放数据。
