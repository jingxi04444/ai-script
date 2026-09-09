# 3D 导演台：首版实现与接入说明

## 实现范围

导演台是画布中的独立 `director` 节点。通过底部添加菜单、画布右键「创建导演台」新建，或点击节点按钮、双击节点进入全屏工作台。它不使用文本／图片生成节点的提示词输入面板。

本轮提供可操作的前端 3D 预演能力：

- 内置产品瓶、人物白模、圆柱展台、方块、球体；支持添加、选择、复制、删除、显示／隐藏、锁定。
- Three.js 三维舞台，导演视角与机位视角切换；对象位置、旋转、缩放与颜色调整。
- 人物的自然站立、抬手展示、迈步三种静态姿势。
- 多机位管理、位置与看向目标、视野角度；正面全景、产品特写、高位俯拍、缓慢推进预设。
- 对象变换、相机位置／目标／视野角度关键帧；时间轴定位、播放预演、增删关键帧、调整时长。
- 场景内撤销／重做；将可序列化工程 JSON 保存在画布节点中；工程 JSON 导入／导出。
- 活动机位 PNG 截图下载，或生成新的图片结果节点并自动连接回导演台节点。
- 16:9、9:16、1:1 输出比例；PNG 最长边 1600 px，导出不包含网格、相机标记和操作轴。

导演台的辅助三维地面网格可在场景设置中关闭，与外层画布背景无关。

## 操作路径

1. 打开工作区画布，添加「导演台」。默认场景包含产品、展台、人物和两个机位。
2. 在对象列表或舞台上选择对象，通过操作轴或右侧数值调整构图。
3. 选择相机，调整位置、目标和视野角度；切到「机位视角」查看最终构图。
4. 需要预演运动时，在时间轴添加关键帧，移动播放位置后修改参数；已启用关键帧的对象会在当前时间自动记录变换。也可以使用「缓慢推进」预设。
5. 点击「截图到画布」。新图片结果节点保留截图，可连接到图片生成节点；原导演台节点保留场景工程，可重新进入编辑。
6. 场景改变后，导演台节点的旧输出会失效，需要重新截图；已经导出的图片结果节点保留各自的历史画面。

快捷键在导演台内部处理：`⌘/Ctrl+Z` 撤销、`⌘/Ctrl+Shift+Z` 重做、`K` 添加关键帧、`Delete/Backspace` 删除选中对象、`Esc` 返回画布。输入控件保持正常文本／数值编辑行为。导演台打开时，外层画布快捷键暂停。

## 架构与鲲鹏参考

本轮参考 [Kunpeng Director（鲲鹏导演台）](https://github.com/pengfeiqiao/kunpeng-director) 的可序列化场景、对象与机位分离、关键帧求值、独立渲染器思路，在现有 React 画布内实现。**没有整仓安装或嵌入鲲鹏应用，也没有引入其本地 MCP 服务、文件存储服务或 Codex CLI 依赖。** 此实现不代表拥有鲲鹏项目的全部功能。

| 层 | 本轮职责 |
| --- | --- |
| React + Three.js | 场景编辑、对象与机位管理、关键帧预演、PNG 截图、画布节点和连线 |
| Spring Boot + MySQL | 复用现有鉴权、文件上传、工作流 `graphJson` 保存及 Provider 网关；无须新增导演台数据库表 |
| Python + Redis Streams | 注册 `resource.director`，读取已导出的截图并作为下游工作流输入；不在 Python 内运行浏览器 3D 编辑器 |

场景 JSON 是状态来源，不保存 Three.js 实例。字段存储在 `WorkflowNodeData.directorScene`；`assetUrl/outputUrl` 保存已导出的截图地址。导演台使用懒加载，仅打开时加载 3D 模块，通过 portal 挂载到页面视口，避免受画布缩放影响。

主要代码位置（相对于项目根目录）：

- `web/front-web/src/pages/Workspace/VisualCanvas/DirectorStudio/`：场景模型、编辑器、视口、属性面板与时间轴。
- `web/front-web/src/types/workflow.ts`、`web/front-web/src/stores/workflowStore.ts`：节点类型与画布状态。
- `web/front-web/src/pages/Workspace/VisualCanvas/VisualCanvasPanel.tsx`：懒加载、弹层、画布联动。
- `workflow-runner/app/skills/director.py`：导演台资源执行。

## 保存、上传和真实生成边界

编辑时同步到当前画布，并自动保存到浏览器。连续本地自动保存失败只提示一次；后续成功保存后恢复正常提示状态。可通过工程 JSON 导出备份。点击「保存项目」在已登录且有有效项目时同步完整工作流到现有 Spring Boot 接口；本地草稿不等于云端已保存。

截图分两条路径：

- 已登录的正式项目使用现有 `/api/files/upload` 上传 PNG，然后把返回的 URL 写入节点，保存到项目工作流。
- 未登录／导演台演示使用本地 PNG dataURL，单张原始 PNG 限制 600 KB。这类截图是浏览器演示资源；真实工作流执行前需要登录并重新导出上传，不能仅依靠页面登录状态变化自动转换。

Spring Boot 工作流 JSON 上限为 2 MB。浏览器存储容量也有限，大量本地图片可能触发保存失败，应导出备份并使用正式上传 URL，不建议在正式工作流内存储大量 dataURL。

Python 的 `resource.director`：

- 优先读取 `outputUrl`，其次读取 `assetUrl`，输出 `mediaType: image` 和 `assetUrl`。
- 没有截图时明确失败，不伪造成功；无截图的场景仍然允许保存为草稿。
- 拒绝 `data:`、`blob:` 和非法协议地址；接受 HTTP(S) URL 或站内上传路径。
- 无论是否启用 Provider 网关，都使用真实的导演台资源读取逻辑，不切换为模拟导演台结果。

**目前可验证的真实生成链路是整图工作流的图片生成分支**：导演台／图片结果节点 → Python 上游输出 → Spring 图片客户端的参考图参数。图片供应商还必须支持现有客户端发送的 `reference_images` 协议；图片参考只能提供构图条件，不能保证模型精确保留人物姿态或机位。

以下原有能力边界本轮没有改动：

- 单独点击图片节点的「生成」按钮，现有画布代码仍返回固定 demo 图片，未改为真实图片接口；单独按钮并未证明引用图被模型使用。
- 整图工作流的视频分支目前只向视频客户端传递提示词和模型，尚未传入参考图片。截图虽可在画布连接视频节点，但不能据此承诺真实图生视频参考已生效。
- 真实生成需要可用的 Spring Boot、Redis、MySQL、Python runner、已启用的 Provider 网关和数据库中的实际模型配置。关闭真实网关时，其余生成节点仍可能使用原有 Demo Skill。

## 当前限制

- 仅内置基础模型和白模；不包含 GLB/GLTF 导入、用户产品模型重建或在线模型资产库。
- 人物姿势为预置静态白模，不包含自由骨骼／关节编辑、动作捕捉或骨骼动画。
- 时间轴用于浏览器关键帧预演；本轮不包含 MP4／WebM 视频编码导出、FFmpeg 合成或预演视频上传。
- 不包含 AI 自动布景、自然语言操纵场景、AI 图像识别还原 3D、全景／高斯泼溅场景。
- 不包含多人协作编辑、远程冲突合并、灯光编辑器、分镜批量自动建立机位。
- 场景最多 100 个对象、16 个机位、每轨 240 个关键帧、时长 1–120 秒；工程 JSON 导入上限 1 MB。
- 浏览器需要 WebGL 2。无法创建图形上下文时显示错误提示，场景数据仍可保存；需启用硬件加速或换用支持的浏览器。

## 自测命令

以下命令从项目根目录执行；前端依赖和 Python `.venv` 需先安装。

```bash
# 前端类型检查和生产构建
npm --prefix web/front-web run build

# 场景默认值、归一化、导入边界与关键帧插值测试
node --test web/front-web/src/pages/Workspace/VisualCanvas/DirectorStudio/directorScene.test.mjs

# Python 资源校验、上游引用与既有 runner 回归测试
cd workflow-runner
.venv/bin/python -m unittest discover -s tests -v
```

Java 测试从项目根目录执行：

```bash
mvn -f server/pom.xml -q -Dtest=WorkflowServiceImplTest,WorkflowProviderGatewayServiceImplTest test
```

浏览器回归测试（从 `web/front-web` 执行，先启动 Vite；本机需可用的 Playwright 和 Chromium）：

```bash
node tests/director-studio.e2e.mjs
node tests/director-controls.e2e.mjs
```

可用 `DIRECTOR_PLAYWRIGHT_MODULE` 指定 Playwright 模块绝对路径，`DIRECTOR_CHROMIUM_PATH` 指定浏览器可执行文件，`DIRECTOR_BASE_URL` 指定前端 URL（默认 `http://127.0.0.1:4174`）。测试使用独立浏览器并拦截业务 API，不会调用真实模型或修改实际账号数据。覆盖真实 WebGL／鼠标拖轴、保存重开、导入导出、截图上传成功／失败、旧快照失效、存储容量不足与画布连线。

已运行的 Python runner 需要重启以加载新增的 `resource.director`；数据库结构不需要为导演台追加迁移。

手工验收：新增与重开导演台；拖动和输入对象参数；切换横竖比例；添加／删除机位；关键帧播放与撤销；PNG 下载及截图回画布；刷新后恢复场景；未截图运行拦截；本地与正式上传路径区分。真实供应商生成涉及额度，需要独立的模型联调验证，不由前端截图成功代替。
