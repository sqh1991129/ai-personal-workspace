#!/usr/bin/env bash
# 零依赖一次性核对脚本入口（不是测试框架，见 AGENTS.md「尚未引入」与 issue R18）。
# 改动 src/api、src/stores、src/router、src/views、src/components 后请跑本脚本。
# 用法：bash scripts/verify/run.sh
set -uo pipefail
cd "$(dirname "$0")/../.."

export VUE_APP_API_BASE="${VUE_APP_API_BASE:-/api}"
export VUE_APP_API_TIMEOUT="${VUE_APP_API_TIMEOUT:-15000}"
export VUE_APP_TITLE='个人 AI 工作台'
export BASE_URL=/

# Node 会唠叨一句「.ts 由 ESM loader 加载时缺 type 字段」，与核对结果无关
quiet() { grep -vE "MODULE_TYPELESS|Reparsing ES module|To eliminate this warning|trace-warnings"; }

status=0
run() { # $1=MOCK_AUTH $2=suite
  local out
  out=$(VUE_APP_MOCK_AUTH="$1" node --import ./scripts/verify/register.mjs "./scripts/verify/$2.ts" 2>&1 | quiet)
  echo "$out" | grep -E "passed=|FAIL" || { echo "!! $2 (MOCK_AUTH=$1) 没有产出结果"; status=1; }
  echo "$out" | grep -q "failed=0" || status=1
}

# 第 0 轮：源码扫描。业务假数据已于 2026-09-07 彻底删除（issue R21），不许再以开关或常量的形式回流。
# 只允许登录侧的 VUE_APP_MOCK_AUTH 继续存在。
banned=$(grep -rnE 'VUE_APP_MOCK_API|IS_MOCK_API|IS_MOCK_CHAT|IS_MOCK_KNOWLEDGE|MOCK_(SESSIONS|MESSAGES|KNOWLEDGE_BASES|DOCUMENTS|CHUNKS|RECALL_HITS|KB_IDS)|streamWithMock|SUGGESTIONS|INDEX_SERVICE|UPLOAD_STAGES' src scripts/verify --include='*.ts' --include='*.vue' --include='*.mjs')
if [ -n "$banned" ]; then
  echo "$banned" | sed 's/^/FAIL 源码仍含业务假数据标识: /'
  echo "no-mock passed=0 failed=1"
  status=1
else
  echo "no-mock passed=1 failed=0"
fi

run false api-contract
run false router-guard
run false ssr-render
run true  api-contract
run true  ssr-render

exit $status
