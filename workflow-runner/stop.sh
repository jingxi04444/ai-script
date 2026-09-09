#!/usr/bin/env bash
set -Eeuo pipefail

RUNNER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="${RUNNER_DIR}/.run/workflow-runner.pid"

if [[ ! -f "${PID_FILE}" ]]; then
  echo "Workflow Runner 未运行（没有 PID 文件）"
  exit 0
fi

RUNNER_PID="$(tr -d '[:space:]' < "${PID_FILE}")"
if [[ -z "${RUNNER_PID}" ]] || ! kill -0 "${RUNNER_PID}" 2>/dev/null; then
  rm -f "${PID_FILE}"
  echo "Workflow Runner 已停止，已清理过期 PID 文件"
  exit 0
fi

PROCESS_COMMAND="$(ps -p "${RUNNER_PID}" -o command= 2>/dev/null || true)"
if [[ "${PROCESS_COMMAND}" != *"uvicorn app.main:app"* ]]; then
  echo "PID ${RUNNER_PID} 不是 Workflow Runner 进程，拒绝停止：${PROCESS_COMMAND}" >&2
  exit 1
fi

echo "正在停止 Workflow Runner，PID=${RUNNER_PID}…"
kill "${RUNNER_PID}"
for _ in $(seq 1 20); do
  if ! kill -0 "${RUNNER_PID}" 2>/dev/null; then
    rm -f "${PID_FILE}"
    echo "Workflow Runner 已停止"
    exit 0
  fi
  sleep 0.25
done

echo "进程未在预期时间内退出，请检查：ps -p ${RUNNER_PID} -o command=" >&2
exit 1
