# AI Script Server

Spring Boot + MyBatis-Plus backend for AI Script.

## Stack

- Java 17
- Spring Boot 3.x
- MyBatis-Plus
- MySQL 8.0
- Redis
- JWT + Spring Security
- springdoc-openapi
- EasyExcel
- MinIO / OSS compatible storage

## Local Start

1. Create MySQL schema using `doc/global-database/mysql/ai_script_mysql_schema.sql`.
2. Initialize default data using `doc/global-database/mysql/ai_script_mysql_seed.sql`.
3. Update `src/main/resources/application-dev.yml`.
4. Start Redis and MySQL.
5. Run:

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Swagger UI:

```text
http://localhost:8080/swagger-ui/index.html
```

## Implemented Modules

- Auth: `/api/auth/**`, `/api/admin/auth/**`
- Project: `/api/projects/**`, `/api/admin/projects/**`
- Brief: `/api/briefs/**`
- Script and template: `/api/scripts/**`, `/api/admin/templates/**`
- Storyboard: `/api/storyboards/**`
- Source analysis: `/api/source-analysis`, `/api/video/share-url/parse`, `/api/script-generator/extract-copy`
- Asset library: `/api/assets/**`, `/api/selling-point-assets/**`, `/api/viral-assets/**`
- Compliance: `/api/compliance/**`, `/api/admin/compliance/words/**`
- Audit flow: `/api/audit/tasks`, `/api/admin/audit/tasks/**`
- Membership and payment: `/api/membership/**`, `/api/payments/**`
- Generation task: `/api/tasks/**`
- Admin dashboard and users: `/api/admin/dashboard/**`, `/api/admin/users/**`
- System management:
  - Prompt templates: `/api/admin/system/prompt-templates/**`
  - Import templates: `/api/admin/system/import-templates/**`
  - Roles: `/api/admin/system/roles/**`
  - Permissions and menus: `/api/admin/system/permissions/**`
  - User roles: `/api/admin/system/users/{id}/roles`
- Notifications: `/api/notifications/**`, `/api/admin/notifications/**`

## Provider Configuration

Provider configs are maintained through `/api/admin/providers` and stored in `sys_api_provider_config`.
Provider API keys are encrypted before persistence. Configure `app.secret.cipher-key` with a stable production secret before creating Provider records.

### LLM

- `providerType`: `llm`
- `providerName`: e.g. `OpenAI Compatible`
- `platform`: e.g. `openai`, `dashscope`, `deepseek`
- `endpointUrl`: chat completions URL, e.g. `https://api.example.com/v1/chat/completions`
- `apiKey`: provider API key
- `configJson`:

```json
{"model":"gpt-4o-mini","temperature":0.7}
```

### Aliyun SMS

- `providerType`: `sms`
- `providerName`: `Aliyun SMS`
- `platform`: `aliyun`
- `endpointUrl`: `https://dysmsapi.aliyuncs.com/`
- `apiKey`: Aliyun `AccessKeySecret`
- `configJson`:

```json
{"accessKeyId":"your-access-key-id","signName":"短信签名","templateCode":"SMS_000000000","regionId":"cn-hangzhou"}
```

### Aliyun OSS

Set `app.storage.provider=aliyun-oss`.

For OSS, `app.storage.endpoint` can be either the bucket endpoint or the region endpoint. Bucket endpoint is recommended:

```yaml
app:
  storage:
    provider: aliyun-oss
    endpoint: https://your-bucket.oss-cn-hangzhou.aliyuncs.com
    bucket: your-bucket
    access-key: your-access-key-id
    secret-key: your-access-key-secret
    region: cn-hangzhou
    public-base-url: https://your-cdn-domain.example.com
```

Environment variables example:

```bash
STORAGE_PROVIDER=aliyun-oss
STORAGE_ENDPOINT=https://your-bucket.oss-cn-hangzhou.aliyuncs.com
STORAGE_BUCKET=your-bucket
STORAGE_ACCESS_KEY=your-access-key-id
STORAGE_SECRET_KEY=your-access-key-secret
STORAGE_REGION=cn-hangzhou
STORAGE_PUBLIC_BASE_URL=
```

The legacy `aliyun.oss.*` configuration is also supported and takes precedence when set:

```yaml
aliyun:
  oss:
    endpoint: ${ALIYUN_OSS_ENDPOINT:oss-cn-hangzhou.aliyuncs.com}
    access-key-id: ${ALIYUN_OSS_ACCESS_KEY_ID}
    access-key-secret: ${ALIYUN_OSS_ACCESS_KEY_SECRET}
    bucket-name: ${ALIYUN_OSS_BUCKET_NAME}
    custom-domain: ${ALIYUN_OSS_CUSTOM_DOMAIN:}
    dir-prefix: ${ALIYUN_OSS_DIR_PREFIX:dataelf/}
```

## Payment Configuration

Real payment uses WeChat Pay Native QR code and Alipay face-to-face QR code. Do not hardcode merchant secrets in code, SQL, or frontend files.

Required environment variables for production:

```bash
PAYMENT_ENABLED=true
PAYMENT_DEV_MODE=false

# WeChat Pay Native（当前关闭；需要重新开放时再设为 true）
PAYMENT_WECHAT_ENABLED=false
WECHAT_PAY_APP_ID=your-wechat-app-id
WECHAT_PAY_MCH_ID=your-merchant-id
WECHAT_PAY_API_V3_KEY=your-api-v3-key
WECHAT_PAY_PRIVATE_KEY_PATH=/secure/path/apiclient_key.pem
WECHAT_PAY_MCH_SERIAL_NO=your-merchant-certificate-serial
WECHAT_PAY_NOTIFY_URL=https://your-api-domain.com/api/payments/notify/wechat/native

# WeChat Pay auto-renewal (scheduled deduct / entrusted payment)
# Requires applying for the "周期扣费/委托代扣" product in the WeChat Pay merchant portal and creating a deduction template to obtain PLAN_ID.
WECHAT_PAY_AUTO_DEDUCT_ENABLED=false
WECHAT_PAY_AUTO_DEDUCT_PLAN_ID=your-deduct-plan-id
WECHAT_PAY_CONTRACT_NOTIFY_URL=https://your-api-domain.com/api/payments/notify/wechat/contract
WECHAT_PAY_DEDUCT_NOTIFY_URL=https://your-api-domain.com/api/payments/notify/wechat/deduct

# Alipay QR payment
PAYMENT_ALIPAY_ENABLED=true
ALIPAY_APP_ID=your-alipay-app-id
ALIPAY_MERCHANT_PRIVATE_KEY=your-rsa2-private-key
ALIPAY_PUBLIC_KEY=alipay-public-key
ALIPAY_NOTIFY_URL=https://your-api-domain.com/api/payments/notify/alipay/scan
ALIPAY_SELLER_ID=your-alipay-seller-id
ALIPAY_SERVER_URL=https://openapi.alipay.com/gateway.do
ALIPAY_SIGN_TYPE=RSA2

# Alipay auto-renewal (merchant withholding / cycle deduct)
# Requires applying for the "商家扣款" or "周期扣款" product in the Alipay open platform.
PAYMENT_ALIPAY_AUTO_DEDUCT_ENABLED=true
ALIPAY_AUTO_DEDUCT_PRODUCT_CODE=GENERAL_WITHHOLDING
ALIPAY_AUTO_DEDUCT_SIGN_SCENE=your-sign-scene
ALIPAY_CONTRACT_NOTIFY_URL=https://your-api-domain.com/api/payments/notify/alipay/contract
ALIPAY_DEDUCT_NOTIFY_URL=https://your-api-domain.com/api/payments/notify/alipay/deduct
```

Database migration for existing deployments:

```text
doc/global-database/mysql/ai_payment_real_pay_migration.sql
```

Notes:

- WeChat and Alipay notify URLs must be public HTTPS URLs reachable by the payment platforms.
- `/api/payments/notify/wechat/native` and `/api/payments/notify/alipay/scan` are the only real payment callback endpoints.
- The legacy generic payment callback is disabled and must not be used for real payments.
- `PAYMENT_DEV_MODE=true` enables local mock payment only for development; keep it `false` in production.

`STORAGE_ENDPOINT` should be the bucket endpoint. If the `https://` scheme is omitted, the server will automatically add it.
Region endpoint such as `https://oss-cn-hangzhou.aliyuncs.com` is also supported; the server will automatically convert it to `https://your-bucket.oss-cn-hangzhou.aliyuncs.com/objectKey`.

File upload endpoints:

- User assets: `/api/files/upload`, with membership and storage-quota checks.
- Platform assets: `/api/admin/files/upload`, requiring an admin login and `admin:file:upload` permission. Supports `site-config` (default) and `script-template-video` folders without charging a user's membership storage quota.

Existing deployments should apply `doc/global-database/mysql/migrations/20260831110000_admin_file_upload.sql` to update the upload permission path, then restart the backend and update the admin frontend together. The migration preserves existing role grants. The admin upload endpoint also enforces its permission in code, including before the migration is applied.

## Product Frame OCR

Product-frame image uploads use Alibaba Cloud traditional OCR `RecognizeBasic` by default. Table files continue to use the built-in spreadsheet parser. Configure OCR credentials independently from OSS credentials:

```bash
OCR_ENABLED=true
OCR_PROVIDER=aliyun
ALIYUN_OCR_ACCESS_KEY_ID=your-ocr-access-key-id
ALIYUN_OCR_ACCESS_KEY_SECRET=your-ocr-access-key-secret
ALIYUN_OCR_ENDPOINT=ocr-api.cn-hangzhou.aliyuncs.com
ALIYUN_OCR_REGION_ID=cn-hangzhou
```

Alibaba Cloud failures can fall back to local Tesseract. Set `OCR_FALLBACK_TO_TESSERACT=false` when the deployment must use Alibaba Cloud OCR only.

## Operation Logs

Non-GET controller requests are recorded into `sys_operation_log` through an AOP aspect.

Admin query endpoint:

```text
GET /api/admin/operation-logs?page=1&pageSize=10&moduleCode=projects&resultStatus=success
```

## Dynamic RBAC

Spring Security loads permissions from `sys_user_role`, `sys_role`, `sys_role_permission`, and `sys_permission` on each JWT request.

- `/api/admin/**` requires an authenticated admin user (`sys_user.user_type = admin`).
- API permissions are enabled by records in `sys_permission`:
  - `permission_type`: `api`
  - `permission_code`: e.g. `system:provider:update`
  - `path`: Ant-style path, e.g. `/api/admin/providers/**`
  - `status`: `1`
- If an API path matches a configured API permission, the current user's roles must include that permission.
- If no API permission is configured for a path, the request falls back to authenticated access. This keeps rollout incremental while menus and API permissions are being maintained.
- `/api/admin/auth/admin-info` and `/api/admin/auth/login` return `roles`, `permissions`, and `menus` for dynamic admin navigation and button control.
