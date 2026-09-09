# AI Script Workflow Runner

Python 工作流执行服务。Spring Boot 负责鉴权、项目、工作流定义、额度、公开 API 和 Provider 密钥；本服务消费 Redis Streams 命令，从共用 MySQL 读取不可变画布快照，按 DAG 依赖执行 Skill，并将运行事件写回 Redis。

## 本地启动

推荐使用一键脚本：

```bash
cd workflow-runner
./start.sh
```

脚本会自动创建 `.venv`、安装缺少的依赖、后台启动服务并检查 `/health`。常用命令：

```bash
./status.sh              # 查看进程和健康状态
tail -f .run/workflow-runner.log
./stop.sh                # 安全停止
./start.sh --foreground  # 前台开发模式
```

第一次接入真实模型前，需要先准备环境配置：

```bash
cp .env.example .env
```

编辑 `.env` 中的 MySQL、Redis 和 `WORKFLOW_PROVIDER_GATEWAY_TOKEN`，其中网关令牌必须与 Spring Boot 使用的值一致。不创建 `.env` 也可以启动，此时使用内置本地默认值并运行 Demo Skill。

也可以手动启动：

```bash
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload --port 8091
```

执行前先应用数据库迁移：

```text
doc/global-database/mysql/migrations/20260904110000_workflow_runner.sql
```

健康检查：`GET http://127.0.0.1:8091/health`

## 使用数据库中的真实模型

后台“模型管理”的配置保存在 `sys_api_provider_config`，其中 `config_json.model` 是模型名。工作流执行器不读取或解密 API Key，而是调用 Spring Boot 内部网关，由现有 Java Provider 客户端完成模型调用。

Spring Boot 与 Python 必须配置相同的长随机令牌：

```text
WORKFLOW_PROVIDER_GATEWAY_TOKEN=replace-with-a-long-random-token
```

并在 Python 中启用：

```text
WORKFLOW_PROVIDER_GATEWAY_ENABLED=true
```

已支持 LLM 文本/脚本、图片、视频、TTS、批量 1—100 个素材镜头以及调用 `editor` / `video_editor` Provider 合成 1—20 条视频。关闭真实网关时仍会使用 Demo Skill，方便无模型配置的本地 UI 联调。

画布节点与 `provider_type` 的映射：

| 画布能力 | provider_type |
| --- | --- |
| 文本、脚本、分镜提示词、品类 Skill | `llm` |
| 图片生成 | `image`（兼容 `vision`） |
| 视频镜头 | `video` |
| 音乐 | `music` |
| 配音 | `tts` |
| 多条成片组装 | `editor`（兼容 `video_editor`） |

每条生成 Provider 的 `config_json` 至少配置实际模型名，例如 `{"model":"provider-model-id"}`；通用固定参数可以放在 `request_defaults`。画布模型下拉菜单会读取 `/api/workflow/models`，不再只依赖前端写死的名称。

节点失败默认指数退避重试 3 次；命令超过重试上限会写入 Redis Stream `aiscript:workflow:commands:dead-letter`。

异步图片/视频供应商可在对应 Provider 的 `config_json` 中配置轮询协议：

```json
{
  "model": "provider-model-id",
  "async_job": {
    "enabled": true,
    "task_id_path": "data.task_id",
    "status_url_template": "https://provider.example/tasks/{taskId}",
    "status_method": "GET",
    "status_path": "data.status",
    "success_values": ["SUCCESS", "COMPLETED"],
    "failure_values": ["FAILED", "CANCELED"],
    "result_url_paths": ["data.output.video_url", "data.url"],
    "error_paths": ["data.error", "message"],
    "poll_interval_ms": 3000,
    "max_wait_ms": 900000
  }
}
```

也支持 POST 查询：将 `status_method` 设为 `POST`，通过 `status_task_id_field` 指定任务 ID 字段，并可用 `status_request_defaults` 添加固定参数。供应商 Key 始终只由 Spring Boot 解密和使用。

### SiliconFlow 视频专用轮询

当 Provider 满足以下任一条件时，会自动使用 SiliconFlow 视频专用适配器，不需要手写上述 JSONPath：

- `provider_type` 为 `video` 且 `platform` 为 `siliconflow` / `siliconcloud`
- `provider_type` 为 `video` 且 `endpoint_url` 位于 `api.siliconflow.cn`

推荐数据库配置：

```text
provider_type: video
platform: siliconflow
endpoint_url: https://api.siliconflow.cn/v1/video/submit
config_json: {"model":"Wan-AI/Wan2.2-T2V-A14B"}
```

适配器会从提交结果读取 `requestId`，向 `/v1/video/status` POST `{"requestId":"..."}`，并识别 `InQueue`、`InProgress`、`Succeed`、`Failed`。成功时读取 `results.videos[].url`，同时标记结果是需要尽快转存的临时地址。轮询间隔和最大等待时间仍可通过 `async_job.poll_interval_ms`、`async_job.max_wait_ms` 覆盖；代理场景可通过 `async_job.status_url` 指定状态接口。
