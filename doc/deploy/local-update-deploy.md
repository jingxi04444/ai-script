# 本地一键更新线上服务

本项目提供脚本：

```bash
scripts/deploy-update.sh
```

作用：在本地重新构建后端和两个前端，并上传到服务器 `/opt/ai-script`，最后重启后端服务、重载 Nginx。

## 默认部署目标

默认配置如下：

```text
服务器：47.96.115.22
用户：root
远程目录：/opt/ai-script
systemd 服务：ai-script
SSH 端口：22
```

## 前置要求

本地需要安装：

```bash
npm
mvn
ssh
scp
tar
```

如果使用密码登录服务器，还需要：

```bash
expect
```

macOS 可用 Homebrew 安装：

```bash
brew install expect maven node
```

## 使用方式

### 方式一：使用 SSH 密钥登录（推荐）

如果本机已经能免密登录服务器：

```bash
ssh root@47.96.115.22
```

则直接执行：

```bash
bash scripts/deploy-update.sh
```

### 方式二：使用密码登录

不要把密码写进脚本，执行时通过环境变量传入：

```bash
DEPLOY_PASSWORD='你的服务器密码' bash scripts/deploy-update.sh
```

当前服务器如果仍使用原 root 密码，可执行：

```bash
DEPLOY_PASSWORD='whwh@2026' bash scripts/deploy-update.sh
```

> 注意：密码会进入当前终端历史记录。更安全的方式是配置 SSH 密钥，或者执行后清理 shell history。

## 自定义部署参数

脚本支持以下环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DEPLOY_HOST` | `47.96.115.22` | 服务器 IP |
| `DEPLOY_USER` | `root` | SSH 用户 |
| `DEPLOY_SSH_PORT` | `22` | SSH 端口 |
| `DEPLOY_REMOTE_DIR` | `/opt/ai-script` | 远程部署目录 |
| `DEPLOY_SERVICE` | `ai-script` | systemd 服务名 |
| `DEPLOY_PASSWORD` | 空 | SSH 密码；为空时使用 SSH 密钥 |

示例：

```bash
DEPLOY_HOST=47.96.115.22 \
DEPLOY_USER=root \
DEPLOY_PASSWORD='你的服务器密码' \
bash scripts/deploy-update.sh
```

## 脚本执行流程

脚本会依次执行：

1. 构建后端：

   ```bash
   cd server && mvn clean package -DskipTests
   ```

2. 构建用户端：

   ```bash
   cd web/front-web && npm run build
   ```

3. 构建管理端：

   ```bash
   cd web/admin-web && npm run build
   ```

4. 打包产物：

   ```text
   server/ai-script-server.jar
   front-web/dist
   admin-web/dist
   ```

5. 上传到服务器 `/tmp`。

6. 备份服务器当前版本到：

   ```text
   /opt/ai-script/releases/backup-时间戳
   ```

7. 替换线上目录：

   ```text
   /opt/ai-script/server
   /opt/ai-script/front-web
   /opt/ai-script/admin-web
   ```

8. 重启后端服务：

   ```bash
   systemctl restart ai-script
   ```

9. 重载 Nginx：

   ```bash
   systemctl reload nginx
   ```

10. 验证后端健康检查：

    ```bash
    curl http://127.0.0.1:8080/actuator/health
    ```

## 更新完成后的访问地址

```text
用户端：https://www.laiheai.com/
管理端：https://www.laiheai.com/admin/
健康检查：https://www.laiheai.com/actuator/health
```

## 回滚方式

脚本每次更新前会在服务器保留备份，例如：

```text
/opt/ai-script/releases/backup-20260627235959
```

如需回滚，可登录服务器后执行：

```bash
BACKUP=/opt/ai-script/releases/backup-20260627235959
rm -rf /opt/ai-script/server /opt/ai-script/front-web /opt/ai-script/admin-web
cp -a "$BACKUP/server" /opt/ai-script/server
cp -a "$BACKUP/front-web" /opt/ai-script/front-web
cp -a "$BACKUP/admin-web" /opt/ai-script/admin-web
systemctl restart ai-script
systemctl reload nginx
```

## 注意事项

- 脚本不会执行数据库 SQL；数据库变更需要单独确认后再执行。
- 脚本不会修改 `/etc/ai-script/ai-script.env`，因此不会覆盖线上 MySQL、Redis、JWT 等配置。
- `/etc/ai-script/ai-script.env` 必须保留 `APP_SECRET_CIPHER_KEY`。该值用于加密/解密后台 Provider API Key 等敏感信息，线上已有加密数据后不要随意更换，否则旧密文会无法解密。
- 脚本不会删除 `/opt/ai-script/uploads`，已上传文件会保留。
- 如果构建失败，脚本会停止，不会更新服务器。
- 如果上传后服务启动失败，可使用上面的备份目录回滚。
