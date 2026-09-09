#!/usr/bin/env bash
set -Eeuo pipefail

RUNNER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="${RUNNER_DIR}/.run/workflow-runner.pid"
LOG_FILE="${RUNNER_DIR}/.run/workflow-runner.log"
HOST="${WORKFLOW_HOST:-127.0.0.1}"
PORT="${WORKFLOW_PORT:-8091}"

if [[ ! -f "${PID_FILE}" ]]; then
  echo "状态: stopped"
  exit 1
fi

RUNNER_PID="$(tr -d '[:space:]' < "${PID_FILE}")"
if [[ -z "${RUNNER_PID}" ]] || ! kill -0 "${RUNNER_PID}" 2>/dev/null; then
  echo "状态: stopped（PID 文件已过期）"
  exit 1
fi

echo "状态: running"
echo "PID: ${RUNNER_PID}"
echo "健康检查: http://${HOST}:${PORT}/health"
echo "日志: ${LOG_FILE}"

if command -v curl >/dev/null 2>&1; then
  if HEALTH_RESPONSE="$(curl -fsS "http://${HOST}:${PORT}/health" 2>/dev/null)"; then
    echo "服务响应: ${HEALTH_RESPONSE}"
  else
    echo "服务响应: unavailable"
    exit 2
  fi
fi
