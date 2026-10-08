#!/usr/bin/env bash

set -u

DOUYIN_URL="${1:-https://v.douyin.com/zdCIr1jr9Pg/}"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ai-script-douyin-check.XXXXXX")"
HEADERS_FILE="${WORK_DIR}/headers.txt"
PAGE_FILE="${WORK_DIR}/page.html"
CHROME_LOG="${WORK_DIR}/chrome.log"

cleanup() {
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

find_browser() {
  if [[ -n "${CHROME_BIN:-}" && -x "${CHROME_BIN}" ]]; then
    printf '%s\n' "${CHROME_BIN}"
    return 0
  fi
  local candidate
  for candidate in \
    /usr/bin/chromium \
    /usr/bin/chromium-browser \
    /snap/bin/chromium \
    /usr/bin/google-chrome \
    /usr/bin/google-chrome-stable \
    /opt/google/chrome/google-chrome \
    /opt/google/chrome/chrome; do
    if [[ -x "${candidate}" ]]; then
      printf '%s\n' "${candidate}"
      return 0
    fi
  done
  return 1
}

section() {
  printf '\n[%s]\n' "$1"
}

section "系统环境"
printf 'URL: %s\n' "${DOUYIN_URL}"
printf 'OS: '
uname -a

section "DNS"
if command -v getent >/dev/null 2>&1; then
  DNS_RESULT="$(getent ahosts v.douyin.com 2>&1)"
  if [[ -n "${DNS_RESULT}" ]]; then
    printf '%s\n' "${DNS_RESULT}" | head -n 3
    printf '结果: DNS解析成功\n'
  else
    printf '结果: DNS解析失败\n'
  fi
else
  printf '跳过: 系统没有getent命令\n'
fi

section "HTTPS和短链跳转"
if ! command -v curl >/dev/null 2>&1; then
  printf '结果: 未安装curl，无法继续网络测试\n'
  exit 2
fi

CURL_RESULT="$(curl \
  --silent \
  --show-error \
  --location \
  --connect-timeout 10 \
  --max-time 40 \
  --user-agent 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36' \
  --dump-header "${HEADERS_FILE}" \
  --output /dev/null \
  --write-out 'http_code=%{http_code}\nfinal_url=%{url_effective}\nremote_ip=%{remote_ip}\nconnect=%{time_connect}s\nttfb=%{time_starttransfer}s\ntotal=%{time_total}s\n' \
  "${DOUYIN_URL}" 2>&1)"
CURL_EXIT=$?
printf '%s\n' "${CURL_RESULT}"
if [[ ${CURL_EXIT} -ne 0 ]]; then
  printf '结果: curl访问失败，优先检查服务器DNS、防火墙、安全组或出口网络\n'
  exit 3
fi
if ! grep -Eq '^HTTP/[^ ]+ 200' "${HEADERS_FILE}"; then
  printf '结果: 没有收到最终HTTP 200，抖音页面访问异常\n'
  exit 4
fi
printf '结果: 服务器能够通过HTTPS访问抖音并完成短链跳转\n'

section "ffmpeg"
if command -v ffmpeg >/dev/null 2>&1; then
  ffmpeg -version 2>/dev/null | head -n 1
else
  printf '结果: 未安装ffmpeg\n'
fi

section "无头浏览器"
if ! BROWSER="$(find_browser)"; then
  printf '结果: 未找到Chrome/Chromium；直接运行JAR时必须在服务器单独安装浏览器\n'
  exit 5
fi
printf '浏览器路径: %s\n' "${BROWSER}"
"${BROWSER}" --version 2>&1 | head -n 1

if command -v timeout >/dev/null 2>&1; then
  timeout 65s "${BROWSER}" \
    --headless=new \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage \
    --disable-blink-features=AutomationControlled \
    --autoplay-policy=no-user-gesture-required \
    --lang=zh-CN \
    --window-size=1365,768 \
    --virtual-time-budget=45000 \
    --dump-dom \
    "${DOUYIN_URL}" >"${PAGE_FILE}" 2>"${CHROME_LOG}"
  CHROME_EXIT=$?
else
  "${BROWSER}" \
    --headless=new \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage \
    --disable-blink-features=AutomationControlled \
    --autoplay-policy=no-user-gesture-required \
    --lang=zh-CN \
    --window-size=1365,768 \
    --virtual-time-budget=45000 \
    --dump-dom \
    "${DOUYIN_URL}" >"${PAGE_FILE}" 2>"${CHROME_LOG}"
  CHROME_EXIT=$?
fi

printf '浏览器退出码: %s\n' "${CHROME_EXIT}"
printf '页面字节数: %s\n' "$(wc -c <"${PAGE_FILE}" | tr -d ' ')"

if grep -Eqi '验证码|安全验证|访问频繁|verify|captcha|异常请求' "${PAGE_FILE}"; then
  printf '结果: 页面被抖音验证或风控拦截，通常与服务器出口IP或无头浏览器环境有关\n'
  exit 6
fi
if grep -q '视频数据加载中' "${PAGE_FILE}"; then
  printf '结果: 页面可以打开，但视频数据仍未加载；可能是抖音加载变慢或服务器出口IP受限\n'
  exit 7
fi
if [[ ${CHROME_EXIT} -ne 0 ]]; then
  printf '结果: Chrome/Chromium运行失败，错误日志尾部如下:\n'
  tail -n 20 "${CHROME_LOG}"
  exit 8
fi

printf '结果: Chrome/Chromium能够打开抖音页面，未发现明显验证拦截\n'
printf '如JAR仍解析失败，请在后端日志中搜索: VIRAL_PARSE_TIMING 和对应traceId\n'
