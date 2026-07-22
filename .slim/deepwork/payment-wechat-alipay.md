# 支付宝/微信 PC 扫码支付完整链路

## 目标

为当前 AI Script 项目实现真实支付链路：微信支付 Native 扫码 + 支付宝扫码支付，覆盖充值、会员开通、余额支付、异步回调验签、支付状态查询、前端二维码/状态轮询、配置文档与验证。

用户选择：首版 PC 扫码支付；已有正式商户配置；密钥必须通过配置/环境变量注入，不能硬编码。

## 已确认现状

- 后端支付入口：`server/src/main/java/com/aiscript/modules/payment/controller/PaymentController.java`
- 当前支付实现：`PaymentServiceImpl` 调用 `integration/pay/PayClient`。
- 当前 `DefaultPayClient` 是本地模拟，返回 `localpay://...`。
- 数据库已有订单、回调、钱包、钱包流水、额度、额度流水、会员套餐、用户会员表。
- 前台支付入口：
  - `web/front-web/src/components/Modal/RechargeDialog.tsx`
  - `web/front-web/src/components/Modal/MemberPaymentDialog.tsx`
  - `web/front-web/src/api/payment.ts`
- 后台会员额度入口：`web/admin-web/src/pages/Billing/BillingPage.tsx`

## 外部接入研究结论

### 微信支付 v3 Native

- 推荐依赖：`com.github.wechatpay-apiv3:wechatpay-java`，官方 README 常见版本 `0.2.17`。
- 可选 Apache HTTP 适配：`com.github.wechatpay-apiv3:wechatpay-apache-httpclient`，常见版本 `0.4.7`。
- Native 下单接口：`/v3/pay/transactions/native`，返回 `code_url`。
- 金额单位：分，整数。
- 回调必须使用微信支付 v3 请求头 + 原始 body 验签和解密。
- 关键配置：商户号、appid、商户 API 私钥、商户证书序列号、API v3 Key、回调地址。
- 支付成功以异步通知/查单为准，前端跳转不能作为支付成功依据。
- 常见类：`RSAAutoCertificateConfig`、`NativePayService`、`PrepayRequest`、`PrepayResponse`、`NotificationParser`、`Transaction`。

### 支付宝扫码

- 推荐官方 SDK：`com.alipay.sdk:alipay-easysdk`；传统备用 `com.alipay.sdk:alipay-sdk-java`。
- PC 扫码更适合用当面付 `alipay.trade.precreate` 返回二维码内容；也可电脑网站支付返回跳转表单。
- 金额单位：元，字符串，保留两位小数。
- 回调使用支付宝公钥验签；通知参数排除 `sign`、`sign_type` 后验签。
- 常见 Easy SDK 类：`Factory`、`Config`、`ResponseChecker`、`Factory.Payment.Common.verifyNotify`。
- 回调处理成功后需按支付宝规范返回 `success`。

## 当前关键缺口

- 无真实微信/支付宝 SDK 与配置。
- `PayClient` 只有单一 mock 方法，不支持按渠道下单、查单、验签回调。
- 回调接口是普通 JSON DTO，不能处理微信原始 JSON + headers，也不能处理支付宝表单回调。
- 用户 ID 写死为 `DEFAULT_USER_ID = 2`。
- 余额支付 UI 有入口，但后端没有真实扣余额。
- 无订单状态查询接口，前端不能轮询真实支付状态。
- 后台无订单管理/套餐保存，本期优先完成用户支付闭环。

## 初步实施计划（待 oracle 审查）

1. 后端支付抽象与配置
   - 新增支付配置属性类，环境变量注入微信/支付宝配置。
   - 扩展支付适配器接口：创建扫码订单、查询订单、验证并解析回调。
   - 保留 local provider 作为未配置时的开发兜底，但正式渠道必须配置完整才启用。

2. 后端订单与业务闭环
   - 新增订单状态查询接口。
   - 新增微信回调接口和支付宝回调接口，使用原始请求体/参数验签。
   - 回调处理统一进入幂等业务方法：金额校验、订单归属、状态流转、钱包充值/会员开通。
   - 实现余额支付：会员订单选择 `balance` 时直接扣钱包余额并开通会员。
   - 去掉关键支付路径中的写死用户 ID，改读登录上下文。

3. 前端支付体验
   - 下单后展示二维码/支付链接，不直接关闭弹窗。
   - 轮询订单状态接口，支付成功后刷新钱包/会员信息。
   - 余额支付成功直接提示并关闭。

4. 文档与验证
   - 补充 application 配置示例和环境变量说明。
   - 构建验证：`mvn -q -DskipTests compile`，`npm run build`。

## 风险点

- 微信回调验签/解密必须使用原始 body 和 headers，不能走普通 DTO。
- 支付宝回调返回内容必须严格为 `success`/`failure`，不能包统一 JSON。
- 金额单位不同：微信分，支付宝元。
- 回调幂等和金额校验是资金安全关键。
- 正式密钥不能进入代码、SQL、日志或前端。

## Specialist sessions

- explorer `ses_0dd393502ffez5X4zVwte5ha6U`：已完成现状梳理。
- librarian `ses_0dd3934e4ffeec5RwWjSdXBd1J`：已完成 SDK/接口研究。
- oracle `ses_0dd37e8d4ffenWXGVLoM6SKK0q`：已完成架构审查。

## Oracle 架构审查结论

当前支付实现不能直接上线。必须先修复以下资金链路硬门槛：

- 回调不能再信任 `PaymentCallbackDTO`，必须按微信/支付宝协议验签。
- 会员金额不能来自前端，必须以服务端套餐价格为准并保存快照。
- 不能再使用 `DEFAULT_USER_ID = 2`，用户端必须读取登录态 `LoginUser`。
- 钱包充值/扣减必须具备幂等与锁/唯一约束，防重复回调重复入账。
- 会员开通不能靠 `subject` 模糊匹配套餐，订单必须保存 `plan_id` 和快照。
- 支付回调接口不能返回统一 `R`，微信/支付宝必须按平台规范返回。
- 生产环境禁止使用 local/mock 支付。

接受的后端实施边界：

1. 扩展支付订单字段：provider、tradeType、planId、snapshot、paidAmount、providerStatus、qrContent、expireTime、notifyTime、lastQueryTime、fulfillStatus、fulfillTime、fulfillError、version。
2. 扩展回调字段：notifyId、providerTradeNo、tradeStatus、totalAmount、headersJson、rawBody、signature、verified、errorMsg、receivedTime。
3. 新增独立 notify endpoint：`/api/payments/notify/wechat/native`、`/api/payments/notify/alipay/scan`。
4. 新增订单查询接口：`GET /api/payments/orders/{orderNo}`，供前端轮询。
5. 余额支付与三方支付分离，同事务扣钱包并开通会员。
6. 先实现 PC 扫码：微信 Native 返回 `code_url`；支付宝 precreate 返回 `qr_code`。

## 后端实现阶段计划

- Phase 1：数据模型、DTO/VO、配置属性、支付适配器接口与真实客户端骨架。
- Phase 2：重构 `PaymentServiceImpl` 的下单、查单、回调幂等履约、余额支付、当前用户。
- Phase 3：新增 notify controller、状态查询接口、迁移 SQL、配置文档。
- Phase 4：编译验证，再进入前端弹窗和轮询改造。

## 后端 Phase 结果

- 已新增微信支付 SDK `com.github.wechatpay-apiv3:wechatpay-java:0.2.17` 与支付宝 EasySDK `com.alipay.sdk:alipay-easysdk:2.2.3`。
- 已新增 `PaymentProperties` 和 `payment.*` 环境变量占位。
- 已重构支付适配器：`PayClient`、`PayClientRouter`、`WechatNativePayClient`、`AlipayScanPayClient`、`LocalPayClient`。
- 微信下单使用 `NativePayService.prepay`，回调使用 `NotificationParser` 解析验签，金额分转元后进入服务层。
- 支付宝下单使用 `Factory.Payment.FaceToFace().preCreate`，回调使用 `Factory.Payment.Common().verifyNotify` 验签。
- 新增回调入口：`PayNotifyController` 读取微信 raw body 与 `Wechatpay-*` headers；支付宝返回纯文本 `success/fail`。
- `PaymentServiceImpl` 已改为当前登录用户；会员金额以后端套餐为准；会员履约用 `order.planId`；钱包流水按 `orderNo + transactionType` 做幂等；订单查询补回二维码参数。
- `MembershipServiceImpl.currentMembership` 已改当前登录用户。
- 已同步 schema 和新增迁移 SQL。
- 复验：`server` 下 `mvn -q -DskipTests compile` 通过。

待复审关注点：

- 微信验签失败当前抛异常，controller 会返回非 SUCCESS，平台会重试；可接受但可进一步改成明确失败响应。
- `RSAAutoCertificateConfig`/`Factory.setOptions` 当前每次调用初始化，简单但不是最优性能。
- 钱包更新仍主要依赖事务与幂等查询，未做数据库行级锁/乐观锁条件更新；当前 MVP 可用，生产高并发仍建议加强。

## Oracle 后端复审结论

结论：暂不进入前端真实联调。真实 SDK 下单/验签雏形已接入，但仍有上线前 blocker：

1. 遗留 `/api/payments/callback` 仍可伪造 paid，必须删除或禁用。
2. 回调幂等依赖 `selectCount`，缺少唯一约束兜底：钱包流水 `order_no + transaction_type`、会员来源订单、provider trade no。
3. 钱包充值/余额支付没有行锁/条件更新，存在并发超扣/丢更新风险。
4. 微信 notify 异常可能被全局异常处理包装为 HTTP 200，导致平台不重试。
5. 回调验签后缺商户身份字段校验：微信 `appid/mchid`，支付宝 `app_id/seller_id`。
6. 支付成功金额允许为空，真实回调成功必须要求金额非空并严格匹配。
7. 查单/补偿链路未接入服务层。
8. `LocalPayClient` 始终注册，未知 payMethod 会落到 local，生产风险。

下一步：先修以上 blocker，再复审；前端改造延后。

## 后端 blocker 修复结果

- 已移除 `PaymentController` 的 `/api/payments/callback`；`handleCallback` 仅保留为禁用方法，直接抛错。
- `PayClientRouter.providerOf` 对未知 `payMethod` 直接拒绝，不再返回 local。
- `LocalPayClient` 受 `payment.dev-mode=true` 条件控制，默认生产不启用。
- 充值订单禁止 `balance` 支付。
- schema/migration 增加钱包流水、会员来源订单、三方交易号、回调通知唯一约束。
- 钱包充值使用 SQL 原子自增；余额支付扣款使用 `balance >= amount` 条件更新。
- 微信 notify 使用 `ResponseEntity`，失败返回 HTTP 500 + FAIL。
- 微信/支付宝回调增加 appId/mchId/sellerId 等字段校验；paid 回调金额必须非空且严格匹配。
- `getOrder/closeOrder/queryProviderOrder` 校验用户和租户。
- 新增 `POST /api/payments/orders/{orderNo}/query-provider` 查单补偿入口。
- 复验：`server` 下 `mvn -q -DskipTests compile` 通过。

注意：`handleProviderNotify` 对重复通知日志唯一键仍可能抛 DuplicateKeyException；订单履约幂等已经有唯一约束兜底，后续可进一步优化回调日志重复处理。

## Oracle 二次复审结论

仍不建议真实支付前端联调，剩余 blocker：

1. 充值钱包仍可能并发双入账：`rechargeWallet` 先查流水再加余额，两个并发回调可能都加余额，后续唯一流水只保留一条。
2. 支付宝 `seller_id` 校验不够强：配置为空或回调为空时会跳过；真实联调前应强制配置并强校验。
3. 微信 `appId` 在 `ensureEnabled` 中未作为必填配置。

最小修复：用订单/履约状态条件更新或先插唯一幂等记录再加余额，确保只有一个事务能执行充值；支付宝 sellerId 必填；微信 appId 必填。

前端支付 UI 已由 designer 完成，待后端 blocker 清零后再审查和复验。

## 最终完成状态

- 剩余后端 blocker 已修复：充值先插唯一钱包流水再原子加余额；重复流水不再重复加余额；回调日志重复唯一键不影响成功返回。
- 支付宝配置强制要求 `appId / merchantPrivateKey / alipayPublicKey / notifyUrl / sellerId`，回调强校验 `app_id / seller_id / total_amount`。
- 微信配置强制要求 `appId / mchId / apiV3Key / privateKeyPath / mchSerialNo / notifyUrl`，回调解析后校验 `appid/mchid`。
- 前端支付弹窗已接入新接口：充值/会员新下单接口、订单查询、手动三方查单；支付后显示二维码内容、订单状态和轮询确认。
- 文档已补充：`server/README.md` 支付环境变量；`doc/backend-api-inventory.md` 移除旧伪回调并列出真实支付接口。
- 最终验证：
  - `server`: `mvn -q -DskipTests compile` 通过。
  - `web/front-web`: `npm run build` 通过；仅 Ant Design `use client` Vite 警告。
  - `git diff --check` 针对本次相关路径通过。
