#!/usr/bin/env bash
# 一键提交并推送 RaidenLite 到 GitHub（origin/main）。
# 用法: bash tools/push.sh "提交说明"
# 凭据已在 .git/.credentials（不入库）；若 push 因 gitconfig.lock 报错会自动清理后重试。
set -e
cd "$(dirname "$0")/.."

GITCFG_LOCK="$HOME/.workbuddy/binaries/PortableGit/versions/1.2.0/etc/gitconfig.lock"
clean_lock() { [ -f "$GITCFG_LOCK" ] && rm -f "$GITCFG_LOCK" || true; }

msg="${1:-update}"
clean_lock
git add -A
if ! git diff --cached --quiet; then
  git commit -m "$msg"
fi
git push origin main 2>/dev/null || { clean_lock; git push origin main; }
clean_lock
git log --oneline -1
echo "OK -> https://github.com/z451146197/RaidenLite"
