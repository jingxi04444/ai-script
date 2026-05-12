# AI Script Server

FastAPI modular-monolith backend for `apps/front-web` and `apps/admin-web`.

## Local Setup

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The default database URL targets the local PostgreSQL database created from `doc/database/schema.sql` and `doc/database/seed.sql`:

```text
postgresql+psycopg://jingxi:123456@localhost:5432/ai_script_dev
```

## LLM Providers

The backend supports multiple OpenAI-compatible chat completion providers stored in `api_provider_configs`.

Provider selection order:

1. Enabled tenant-specific providers, sorted by `priority` ascending.
2. Enabled global providers, sorted by `priority` ascending.
3. Environment-only provider from `LLM_API_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`.
4. Deterministic local fallback when no provider is usable.

Seeded providers use `api_key_encrypted` values like `env:DEEPSEEK_API_KEY`, so metadata lives in PostgreSQL while secrets stay in environment variables.

```bash
DEEPSEEK_API_KEY=your-deepseek-key
DASHSCOPE_API_KEY=your-qwen-key
OPENAI_API_KEY=your-openai-key
```

You can also run a single env-only provider without database config:

```bash
LLM_API_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=your-api-key
LLM_MODEL=deepseek-chat
LLM_TEMPERATURE=0.3
LLM_TIMEOUT_SECONDS=60
LLM_MAX_TOKENS=3000
```

Compatible examples:

| Provider | `LLM_API_BASE_URL` | `LLM_MODEL` example |
| --- | --- | --- |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| 豆包 / 火山方舟 | Use the provider's OpenAI-compatible endpoint | Provider model ID |

Current LLM-backed business endpoints:

| Endpoint | LLM purpose |
| --- | --- |
| `POST /api/product-brief/optimize` | 标准化产品 Brief 和卖点总结 |
| `POST /api/source-analysis/parse-link` | 生成爆款结构分析草稿和拉片报告 |
| `POST /api/scripts/generate` | 生成分镜脚本表格 |
| `POST /api/scripts/compliance-check` | 基于词库命中给出合规修改建议 |

Admin management endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/admin/llm/providers` | 查看数据库中的 LLM Provider 配置，密钥会脱敏 |
| `POST /api/admin/llm/providers` | 新增 OpenAI-compatible Provider |
| `POST /api/admin/llm/providers/{id}/disable` | 停用 Provider |

Example create payload:

```json
{
  "providerName": "DeepSeek",
  "platform": "deepseek",
  "endpointUrl": "https://api.deepseek.com/v1",
  "apiKeyRef": "env:DEEPSEEK_API_KEY",
  "model": "deepseek-chat",
  "priority": 10,
  "timeoutMs": 60000,
  "retryCount": 2,
  "status": "enabled",
  "temperature": 0.3,
  "maxTokens": 3000
}
```

## Frontend Integration

`apps/front-web` and `apps/admin-web` default to `src/services/mock.js`. Set these when integrating the frontends with this backend:

```bash
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## API Docs

After starting the server:

```text
http://127.0.0.1:8000/docs
```
