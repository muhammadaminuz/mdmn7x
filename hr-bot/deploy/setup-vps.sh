#!/usr/bin/env bash
# HR botni Ubuntu VPS ga o'rnatadi yoki yangilaydi (qayta ishga tushirish xavfsiz).
# Ishlatish (root sifatida):
#   curl -fsSL https://raw.githubusercontent.com/muhammadaminuz/mdmn7x/claude/telegram-bot-yasash-llrwz7/hr-bot/deploy/setup-vps.sh | bash
set -euo pipefail

REPO="https://github.com/muhammadaminuz/mdmn7x.git"
BRANCH="claude/telegram-bot-yasash-llrwz7"
DIR="/opt/mdmn7x"
BOT="$DIR/hr-bot"

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Bu skriptni root sifatida ishga tushiring (sudo -i)." >&2
  exit 1
fi

say "Tizim paketlari"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git ca-certificates >/dev/null

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  say "Node.js 20 o'rnatilmoqda"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "Node.js $(node -v)"

say "Claude Code CLI va pm2"
npm install -g --silent @anthropic-ai/claude-code pm2 >/dev/null
echo "claude $(claude --version 2>/dev/null || echo '?')"

say "Bot kodi"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch -q --depth 1 origin "$BRANCH"
  git -C "$DIR" reset -q --hard FETCH_HEAD   # .env va data/ saqlanib qoladi (git'da yo'q)
else
  git clone -q --depth 1 -b "$BRANCH" "$REPO" "$DIR"
fi

cd "$BOT"
if [ ! -f .env ]; then
  say "Sozlamalar (.env)"
  read -r -p "BOT_TOKEN (BotFather): " BOT_TOKEN < /dev/tty
  read -r -p "ADMIN_CHAT_IDS (Telegram ID, bir nechta bo'lsa vergul bilan): " ADMIN_CHAT_IDS < /dev/tty
  read -r -s -p "CLAUDE_CODE_OAUTH_TOKEN (sk-ant-oat01-..., yozilganda ko'rinmaydi): " CLAUDE_TOKEN < /dev/tty
  echo
  read -r -p "MIN_SCORE [70]: " MIN_SCORE < /dev/tty
  cat > .env <<ENV
BOT_TOKEN=$BOT_TOKEN
ADMIN_CHAT_IDS=$ADMIN_CHAT_IDS
CLAUDE_CODE_OAUTH_TOKEN=$CLAUDE_TOKEN
MIN_SCORE=${MIN_SCORE:-70}
CLAUDE_MODEL=sonnet
ANALYSIS_CONCURRENCY=1
NOTIFY_REJECTED=true
RETRY_MINUTES=60
ENV
  chmod 600 .env
else
  echo ".env mavjud — saqlab qolindi (o'zgartirish: nano $BOT/.env)"
fi

say "Paketlar va build"
npm install --silent --no-audit --no-fund >/dev/null
npm run build --silent

say "Botni ishga tushirish (pm2)"
if pm2 describe hr-bot >/dev/null 2>&1; then
  pm2 restart hr-bot --update-env >/dev/null
else
  pm2 start dist/index.js --name hr-bot --cwd "$BOT" --time >/dev/null
fi
pm2 save >/dev/null
pm2 startup systemd -u root --hp /root >/dev/null
pm2 install pm2-logrotate >/dev/null 2>&1 || true

sleep 5
pm2 status hr-bot
echo
pm2 logs hr-bot --lines 15 --nostream || true

cat <<MSG

✅ Tayyor! Bot 24/7 ishlaydi va server qayta yoqilganda o'zi ishga tushadi.

Foydali buyruqlar:
  pm2 logs hr-bot          — loglarni ko'rish (chiqish: Ctrl+C)
  pm2 restart hr-bot       — qayta ishga tushirish
  nano $BOT/.env           — sozlamalarni o'zgartirish (keyin: pm2 restart hr-bot)
  Yangilash                — shu skriptni yana bir marta ishga tushiring
MSG
