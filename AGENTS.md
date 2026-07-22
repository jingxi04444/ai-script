# AI Script 项目开发规范

## 项目概述
AI Script 是一个商业短视频脚本生成平台，包含用户端（front-web）、管理端（admin-web）和后端服务（server）。

## 项目结构
- `web/` - 前端项目根目录
  - `front-web/` - 用户端应用（React + Ant Design）
  - `admin-web/` - 管理端应用（React + Tailwind CSS）
- `server/` - 后端项目根目录（Spring Boot + MyBatis-Plus）
- `doc/` - 项目文档目录
  - `backend-springboot/` - Spring Boot 后端项目结构与开发说明
  - `global-database/mysql/` - MySQL 全局建库与初始化 SQL 文件

## 技术栈

### 前端技术栈
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **用户端 UI 库**: Ant Design 6 + @ant-design/icons
- **管理端 UI 库**: Tailwind CSS 4 + Lucide React
- **路由**: React Router v6
- **状态管理**: Zustand
- **HTTP 请求**: Axios

### 后端技术栈
- **框架**: Spring Boot 3.x
- **JDK**: Java 17
- **ORM**: MyBatis-Plus 3.5.x
- **数据库**: MySQL 8.0
- **缓存**: Redis
- **鉴权**: Spring Security + JWT
- **接口文档**: springdoc-openapi / Swagger
- **文件存储**: MinIO / 阿里云 OSS / 腾讯云 COS
- **Excel 处理**: EasyExcel
- **异步任务**: Spring Task + ThreadPoolTaskExecutor，后续可升级 RabbitMQ / RocketMQ

## 代码规范

### 文件命名
- 组件文件使用 PascalCase: `UserProfile.tsx`
- 工具函数使用 camelCase: `formatDate.ts`
- 类型文件使用 camelCase: `userTypes.ts`
- 样式文件使用 kebab-case: `user-profile.css`

### 组件规范
- 每个组件文件只导出一个组件
- 使用函数组件 + Hooks
- Props 接口以组件名结尾: `UserProfileProps`
- 复杂组件拆分为子组件

### 目录结构规范

#### 前端目录结构
```
src/
├── api/          # API 请求层
├── components/   # 通用组件
├── pages/        # 页面组件
├── hooks/        # 自定义 Hooks
├── stores/       # 状态管理
├── types/        # TypeScript 类型
├── utils/        # 工具函数
├── assets/       # 静态资源
└── styles/       # 样式文件
```

#### 后端目录结构
后端统一放在 `server/` 目录下，采用按业务模块分包的单体架构。

```
server/
├── pom.xml
├── README.md
├── Dockerfile
└── src/
    ├── main/
    │   ├── java/
    │   │   └── com/aiscript/
    │   │       ├── AiScriptApplication.java
    │   │       ├── common/       # 通用响应、枚举、异常、分页、基础实体、工具类
    │   │       ├── config/       # MyBatis-Plus、Redis、Web、线程池、Swagger 等配置
    │   │       ├── security/     # Spring Security、JWT、登录用户上下文、权限校验
    │   │       ├── framework/    # 多租户、操作日志、自动填充、请求日志、文件存储抽象
    │   │       ├── modules/      # 业务模块
    │   │       ├── integration/  # 第三方服务集成：LLM、解析、ASR、视频、TTS、支付、OSS
    │   │       └── task/         # 异步任务：AI 生成、导出、链接解析等
    │   └── resources/
    │       ├── application.yml
    │       ├── application-dev.yml
    │       ├── application-prod.yml
    │       ├── mapper/           # MyBatis XML，仅复杂 SQL 使用
    │       └── templates/        # Excel/PDF 等导入导出模板
    └── test/
        └── java/
```

##### 后端业务模块结构
每个业务模块统一使用以下结构，例如 `modules/project/`：

```
modules/project/
├── controller/   # HTTP 接口入口，用户端和管理端 Controller 分开
├── service/      # 业务接口
├── service/impl/ # 业务实现、事务、状态流转
├── mapper/       # MyBatis-Plus Mapper
├── entity/       # 数据库实体，一张表一个实体
├── dto/          # 请求参数对象
├── vo/           # 响应对象
└── convert/      # DTO、Entity、VO 转换
```

后端核心业务模块包括：
- `auth/` - 前台用户和后台管理员认证
- `user/` - 用户管理
- `tenant/` - 租户/品牌管理
- `project/` - 项目和工作流步骤
- `brief/` - 产品 Brief、卖点、Brief 版本和 AI 检测结果
- `asset/` - 卖点资产库、爆款脚本资产库、素材库
- `source/` - 爆款链接解析、ASR 文案提取、结构公式
- `script/` - 脚本生成、脚本模板、脚本版本
- `storyboard/` - 分镜查询、编辑和导出
- `compliance/` - 合规词库、合规检查、原创度检测
- `auditflow/` - 审核任务、审核记录、审核规则
- `generation/` - AI、视频、配音、导出等异步任务
- `membership/` - 会员套餐和用户会员
- `payment/` - 充值、余额支付、支付回调、钱包流水
- `admin/` - 管理端聚合能力
- `analytics/` - 投放数据、监测链接、A/B 实验
- `system/` - Provider、Prompt 模板、导入模板、权限菜单、操作日志
- `notification/` - 系统通知

### API 规范

#### 前端 API 规范
- API 文件按模块划分: `auth.ts`, `project.ts`
- 使用 axios 实例统一配置
- 请求和响应类型必须定义
- 错误统一处理

#### 后端 API 规范
- 用户端接口统一使用 `/api/**` 前缀，例如 `/api/projects`、`/api/scripts`
- 管理端接口统一使用 `/api/admin/**` 前缀，例如 `/api/admin/users`
- Controller 只处理参数校验、权限声明和响应包装，业务逻辑放到 Service
- 请求参数使用 `DTO`，响应数据使用 `VO`，不要直接返回 Entity
- 列表接口统一支持 `page`、`pageSize`、`keyword` 等分页筛选参数
- 响应格式必须使用统一结构，禁止接口各自返回散乱 JSON
- 需要耗时的 AI 生成、链接解析、视频生成、导出任务必须先创建任务记录，再异步执行

### 前后端统一返回格式

#### 普通接口响应
后端所有非文件下载接口统一返回：

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "traceId": "请求链路ID",
  "timestamp": 1710000000000
}
```

字段说明：
- `code`：业务状态码，`0` 表示成功，非 `0` 表示失败
- `message`：给前端展示或调试使用的提示文案
- `data`：业务数据，列表、详情、登录结果等都放这里
- `traceId`：请求链路 ID，用于排查日志
- `timestamp`：服务端响应时间戳，毫秒

#### 分页接口响应
分页数据统一放在 `data` 内：

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

分页请求参数统一为：
- `page`：当前页，从 `1` 开始
- `pageSize`：每页数量
- `keyword`：关键词，按接口需要支持
- 其他筛选字段按业务命名，例如 `status`、`category`、`projectId`

#### 错误响应
业务错误、参数错误、权限错误也必须保持同一结构：

```json
{
  "code": 40001,
  "message": "参数错误",
  "data": null,
  "traceId": "请求链路ID",
  "timestamp": 1710000000000
}
```

常用错误码：
- `0`：成功
- `40000`：请求参数错误
- `40001`：业务校验失败
- `40100`：未登录或 Token 无效
- `40300`：无权限
- `40400`：资源不存在
- `40900`：数据状态冲突，例如重复提交、余额不足、审核状态不允许修改
- `42900`：请求过于频繁
- `50000`：系统异常
- `50010`：第三方 Provider 调用失败

#### 文件下载响应
文件下载、脚本导出、视频导出接口不包统一 JSON，直接返回文件流：
- 成功时返回 `application/octet-stream`、`application/pdf`、`text/csv`、Excel MIME 等
- 失败时仍返回统一 JSON 错误结构

#### Long ID 返回规范
后端主键使用 `BIGINT` / Java `Long`，返回前端时必须序列化为字符串：

```json
{
  "id": "1871234567890123456"
}
```

前端类型中 ID 统一使用 `string`，不要使用 `number`。

#### 前端 API 解析规范
前端 `axios` 实例必须统一处理后端响应：
- HTTP 状态码非 `2xx` 时进入统一错误处理
- HTTP 成功但 `code !== 0` 时抛出业务错误
- 业务成功时只向页面层返回 `data`
- 登录过期 `40100` 时清理本地登录态并跳转登录页
- 前端页面和 Store 不直接读取 `response.code`，只处理已经解包后的业务数据

前端请求层建议类型：

```ts
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  traceId?: string;
  timestamp?: number;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}
```

后端 Java 建议类型：

```java
public class R<T> {
    private Integer code;
    private String message;
    private T data;
    private String traceId;
    private Long timestamp;
}

public class PageResult<T> {
    private List<T> list;
    private Long total;
    private Long page;
    private Long pageSize;
    private Long pages;
}
```

### 状态管理规范
- 使用 Zustand 进行状态管理
- Store 按功能模块划分
- 保持 Store 简洁，复杂逻辑抽离到 Hooks

### 样式规范
- 用户端使用 Ant Design 组件 + 自定义 CSS
- 管理端使用 Tailwind CSS
- 避免内联样式，使用 CSS 类名
- 使用 CSS 变量管理主题色
- 页面或组件的业务样式必须放在对应页面/组件目录下的独立样式文件中，并在组件内显式引入，例如 `pages/Workspace/workspace-page.css`、`components/Modal/modal-dialogs.css`
- `src/styles/global.css` 只用于全局 reset、基础排版、主题变量、通用工具类和真正跨项目复用的基础样式；不要把单个页面、单个弹窗、单个业务组件的样式写入 `global.css`
- 新增或修改页面/组件样式时，优先创建/维护同目录 CSS 文件；只有确认样式会被多个无关模块复用时，才考虑抽到全局样式

### 后端编码规范
- Java 类名使用 PascalCase，例如 `ProjectController`
- 方法名、变量名使用 camelCase，例如 `createProject`
- 数据库实体类以表业务名命名，例如 `AiProject`、`SysUser`
- Controller 命名：
  - 用户端接口：`ProjectController`
  - 管理端接口：`AdminProjectController`
- DTO 命名：
  - 新建请求：`ProjectCreateDTO`
  - 更新请求：`ProjectUpdateDTO`
  - 查询请求：`ProjectQueryDTO`
- VO 命名：
  - 列表项：`ProjectVO`
  - 详情：`ProjectDetailVO`
- Mapper XML 只用于复杂 SQL，简单 CRUD 使用 MyBatis-Plus BaseMapper
- Service 层负责事务控制，跨表写入必须使用 `@Transactional`
- Provider 密钥、支付密钥、JWT 密钥不得硬编码，必须通过配置或环境变量注入

### MyBatis-Plus 规范
- 主键统一使用 `BIGINT`，Java 使用 `Long`
- 主键策略统一使用 `IdType.ASSIGN_ID`
- 返回前端的 Long ID 建议序列化为字符串，避免 JS 精度丢失
- 逻辑删除字段统一为 `deleted`，`0` 表示未删除，`1` 表示已删除
- 公共字段统一由 `MetaObjectHandler` 自动填充：
  - `createBy`
  - `createTime`
  - `updateBy`
  - `updateTime`
- 多租户业务表必须包含 `tenant_id`，查询和更新必须校验租户权限

## Git 规范
- 提交信息格式: `type(scope): description`
- type: feat, fix, docs, style, refactor, test, chore
- scope: front, admin, api, etc.

## 开发流程
1. 创建功能分支
2. 开发功能
3. 自测验证
4. 提交代码
5. 代码审查
6. 合并主分支

## 数据库规范
- 数据库使用 MySQL 8.0
- 全局建库 SQL 存放在 `doc/global-database/mysql/`
- 当前全局建库文件为 `doc/global-database/mysql/ai_script_mysql_schema.sql`
- 当前全局初始化数据文件为 `doc/global-database/mysql/ai_script_mysql_seed.sql`
- 数据库初始化执行顺序：先执行 `ai_script_mysql_schema.sql`，再执行 `ai_script_mysql_seed.sql`
- 表名统一使用下划线命名
- 系统表使用 `sys_` 前缀，例如 `sys_user`、`sys_role`
- 业务表使用 `ai_` 前缀，例如 `ai_project`、`ai_brief`
- 主键字段统一为 `id BIGINT`
- 金额字段使用 `DECIMAL(14,2)`
- 时间字段使用 `DATETIME`
- JSON 扩展字段使用 MySQL `JSON` 类型
- 所有业务表保留 `create_time`、`update_time`，需要软删除的表保留 `deleted`
- 支付流水、钱包流水、审核记录、操作日志、版本快照原则上只追加不物理删除
- 如果 MVP 暂不实现投放实验功能，可暂缓创建 A/B 实验相关表；若保留，建议使用 `ai_ab_test`、`ai_ab_test_variant` 表名表示业务实验，不代表测试环境表

## 后端详细设计文档
- Spring Boot 后端项目结构说明：`doc/backend-springboot/SpringBoot-MyBatisPlus后端项目结构设计.md`
- MySQL 全局建库脚本：`doc/global-database/mysql/ai_script_mysql_schema.sql`
- MySQL 全局初始化脚本：`doc/global-database/mysql/ai_script_mysql_seed.sql`
