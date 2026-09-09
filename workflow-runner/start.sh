#!/usr/bin/env bash
set -Eeuo pipefail

RUNNER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${WORKFLOW_VENV_DIR:-${RUNNER_DIR}/.venv}"
RUN_DIR="${RUNNER_DIR}/.run"
PID_FILE="${RUN_DIR}/workflow-runner.pid"
LOG_FILE="${RUN_DIR}/workflow-runner.log"
HOST="${WORKFLOW_HOST:-127.0.0.1}"
PORT="${WORKFLOW_PORT:-8091}"
FOREGROUND=false
INSTALL_MISSING=true

for argument in "$@"; do
  case "${argument}" in
    --foreground) FOREGROUND=true ;;
    --no-install) INSTALL_MISSING=false ;;
    -h|--help)
      echo "用法: ./start.sh [--foreground] [--no-install]"
      echo "  --foreground   在当前终端运行，适合查看开发日志"
      echo "  --no-install   缺少依赖时直接退出，不自动安装"
      exit 0
      ;;
    *)
      echo "未知参数: ${argument}" >&2
      exit 2
      ;;
  esac
done

mkdir -p "${RUN_DIR}"

if [[ -f "${PID_FILE}" ]]; then
  EXISTING_PID="$(tr -d '[:space:]' < "${PID_FILE}")"
  if [[ -n "${EXISTING_PID}" ]] && kill -0 "${EXISTING_PID}" 2>/dev/null; then
    echo "Workflow Runner 已运行，PID=${EXISTING_PID}"
    echo "健康检查: http://${HOST}:${PORT}/health"
    exit 0
  fi
  rm -f "${PID_FILE}"
fi

PYTHON_BIN="${WORKFLOW_PYTHON_BIN:-python3}"
if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  echo "未找到 Python：${PYTHON_BIN}" >&2
  exit 1
fi

if ! "${PYTHON_BIN}" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)'; then
  echo "Workflow Runner 需要 Python 3.11 或更高版本" >&2
  exit 1
fi

if [[ ! -x "${VENV_DIR}/bin/python" ]]; then
  echo "正在创建虚拟环境：${VENV_DIR}"
  "${PYTHON_BIN}" -m venv "${VENV_DIR}"
fi

VENV_PYTHON="${VENV_DIR}/bin/python"
if ! "${VENV_PYTHON}" -c 'import fastapi, httpx, pymysql, redis, sqlalchemy, uvicorn' >/dev/null 2>&1; then
  if [[ "${INSTALL_MISSING}" != true ]]; then
    echo "Python 依赖尚未安装，请先执行：${VENV_PYTHON} -m pip install -e ${RUNNER_DIR}" >&2
    exit 1
  fi
  echo "正在安装 Workflow Runner 依赖…"
  "${VENV_PYTHON}" -m pip install -e "${RUNNER_DIR}"
fi

if [[ ! -f "${RUNNER_DIR}/.env" ]]; then
  echo "提示：未检测到 .env，将使用内置本地配置（真实模型网关默认关闭）。"
  echo "      接入真实模型前请复制 .env.example 为 .env 并填写统一网关令牌。"
fi

cd "${RUNNER_DIR}"

if [[ "${FOREGROUND}" == true ]]; then
  exec "${VENV_PYTHON}" -m uvicorn app.main:app --host "${HOST}" --port "${PORT}"
fi

echo "正在后台启动 Workflow Runner…"
nohup "${VENV_PYTHON}" -m uvicorn app.main:app --host "${HOST}" --port "${PORT}" >>"${LOG_FILE}" 2>&1 &
RUNNER_PID=$!
echo "${RUNNER_PID}" > "${PID_FILE}"

for _ in $(seq 1 30); do
  if ! kill -0 "${RUNNER_PID}" 2>/dev/null; then
    echo "Workflow Runner 启动失败，最近日志：" >&2
    tail -n 30 "${LOG_FILE}" >&2 || true
    rm -f "${PID_FILE}"
    exit 1
  fi
  if command -v curl >/dev/null 2>&1 && curl -fsS "http://${HOST}:${PORT}/health" >/dev/null 2>&1; then
    echo "Workflow Runner 启动成功"
    echo "PID: ${RUNNER_PID}"
    echo "健康检查: http://${HOST}:${PORT}/health"
    echo "日志: ${LOG_FILE}"
    exit 0
  fi
  sleep 0.5
done

echo "进程已启动，但健康检查尚未就绪。请查看日志：${LOG_FILE}" >&2
exit 1
