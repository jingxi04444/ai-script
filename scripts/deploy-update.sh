#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_HOST="${DEPLOY_HOST:-47.96.115.22}"
REMOTE_USER="${DEPLOY_USER:-root}"
REMOTE_DIR="${DEPLOY_REMOTE_DIR:-/opt/ai-script}"
REMOTE_SERVICE="${DEPLOY_SERVICE:-ai-script}"
SSH_PORT="${DEPLOY_SSH_PORT:-22}"
PASSWORD="${DEPLOY_PASSWORD:-}"

RELEASE_NAME="ai-script-deploy-$(date +%Y%m%d%H%M%S)"
WORK_DIR="${TMPDIR:-/tmp}/${RELEASE_NAME}"
ARCHIVE_PATH="${TMPDIR:-/tmp}/${RELEASE_NAME}.tar.gz"

log() {
  printf '\033[1;34m[deploy]\033[0m %s\n' "$1"
}

cleanup() {
  rm -rf "$WORK_DIR" "$ARCHIVE_PATH"
}
trap cleanup EXIT

run_ssh() {
  local command="$1"
  if [[ -n "$PASSWORD" ]]; then
    DEPLOY_EXPECT_PASSWORD="$PASSWORD" expect -c "
      set timeout -1
      spawn ssh -p ${SSH_PORT} -o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no ${REMOTE_USER}@${REMOTE_HOST} {${command}}
      expect \"*assword:\"
      send -- \"\$env(DEPLOY_EXPECT_PASSWORD)\\r\"
      expect eof
      set result [wait]
      exit [lindex \$result 3]
    "
  else
    ssh -p "$SSH_PORT" "$REMOTE_USER@$REMOTE_HOST" "$command"
  fi
}

upload_file() {
  local local_path="$1"
  local remote_path="$2"
  if [[ -n "$PASSWORD" ]]; then
    DEPLOY_EXPECT_PASSWORD="$PASSWORD" expect -c "
      set timeout -1
      spawn scp -P ${SSH_PORT} -o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no ${local_path} ${REMOTE_USER}@${REMOTE_HOST}:${remote_path}
      expect \"*assword:\"
      send -- \"\$env(DEPLOY_EXPECT_PASSWORD)\\r\"
      expect eof
      set result [wait]
      exit [lindex \$result 3]
    "
  else
    scp -P "$SSH_PORT" "$local_path" "$REMOTE_USER@$REMOTE_HOST:$remote_path"
  fi
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

require_command npm
require_command mvn
require_command tar
require_command ssh
require_command scp
if [[ -n "$PASSWORD" ]]; then
  require_command expect
fi

log "Building server jar"
(cd "$PROJECT_ROOT/server" && mvn clean package -DskipTests)

log "Building front-web"
(cd "$PROJECT_ROOT/web/front-web" && npm run build)

log "Building admin-web"
(cd "$PROJECT_ROOT/web/admin-web" && npm run build)

log "Packaging artifacts"
mkdir -p "$WORK_DIR/server" "$WORK_DIR/front-web" "$WORK_DIR/admin-web"
cp "$PROJECT_ROOT/server/target/ai-script-server-0.1.0-SNAPSHOT.jar" "$WORK_DIR/server/ai-script-server.jar"
cp -R "$PROJECT_ROOT/web/front-web/dist" "$WORK_DIR/front-web/"
cp -R "$PROJECT_ROOT/web/admin-web/dist" "$WORK_DIR/admin-web/"
tar -C "$(dirname "$WORK_DIR")" -czf "$ARCHIVE_PATH" "$(basename "$WORK_DIR")"

log "Uploading archive to ${REMOTE_USER}@${REMOTE_HOST}"
upload_file "$ARCHIVE_PATH" "/tmp/${RELEASE_NAME}.tar.gz"

log "Installing release and restarting service"
run_ssh "set -euo pipefail
mkdir -p ${REMOTE_DIR}/logs ${REMOTE_DIR}/uploads ${REMOTE_DIR}/releases
rm -rf /tmp/${RELEASE_NAME}
tar -xzf /tmp/${RELEASE_NAME}.tar.gz -C /tmp
if [ -d ${REMOTE_DIR}/server ] || [ -d ${REMOTE_DIR}/front-web ] || [ -d ${REMOTE_DIR}/admin-web ]; then
  BACKUP=${REMOTE_DIR}/releases/backup-\$(date +%Y%m%d%H%M%S)
  mkdir -p \$BACKUP
  [ -d ${REMOTE_DIR}/server ] && cp -a ${REMOTE_DIR}/server \$BACKUP/server
  [ -d ${REMOTE_DIR}/front-web ] && cp -a ${REMOTE_DIR}/front-web \$BACKUP/front-web
  [ -d ${REMOTE_DIR}/admin-web ] && cp -a ${REMOTE_DIR}/admin-web \$BACKUP/admin-web
fi
rm -rf ${REMOTE_DIR}/server ${REMOTE_DIR}/front-web ${REMOTE_DIR}/admin-web
mv /tmp/${RELEASE_NAME}/server ${REMOTE_DIR}/server
mv /tmp/${RELEASE_NAME}/front-web ${REMOTE_DIR}/front-web
mv /tmp/${RELEASE_NAME}/admin-web ${REMOTE_DIR}/admin-web
rm -rf /tmp/${RELEASE_NAME} /tmp/${RELEASE_NAME}.tar.gz
systemctl restart ${REMOTE_SERVICE}
systemctl reload nginx
for i in \$(seq 1 30); do
  if systemctl is-active --quiet ${REMOTE_SERVICE} && curl -fsS http://127.0.0.1:8080/actuator/health; then
    exit 0
  fi
  sleep 2
done
systemctl --no-pager --full status ${REMOTE_SERVICE}
exit 1
"

log "Deployment finished"
log "Front: https://www.laiheai.com/"
log "Admin: https://www.laiheai.com/admin/"
