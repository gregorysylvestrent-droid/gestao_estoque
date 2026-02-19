#!/usr/bin/env bash
set -euo pipefail

# Deploy frontend-only on EC2. API can stay local (outside EC2) behind API_UPSTREAM.
# This script must run inside the EC2 instance.
# This script intentionally does NOT run git clone/pull.

PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
PUBLIC_DIR="${PUBLIC_DIR:-/var/www/logiwms}"
NGINX_SITE="${NGINX_SITE:-logiwms}"
API_UPSTREAM="${API_UPSTREAM:-http://127.0.0.1:3001}"
DISABLE_EC2_BACKEND="${DISABLE_EC2_BACKEND:-false}"

if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
  echo "Projeto invalido em $PROJECT_DIR"
  echo "Execute o script na raiz do repositorio clonado."
  exit 1
fi

API_UPSTREAM="${API_UPSTREAM%/}"

echo "[1/5] Usando codigo local em $PROJECT_DIR (sem git pull)"
cd "$PROJECT_DIR"

echo "[2/5] Instalando dependencias e build do frontend"
npm ci
npm run build

echo "[3/5] Publicando frontend em $PUBLIC_DIR"
sudo mkdir -p "$PUBLIC_DIR"
sudo rsync -a --delete "$PROJECT_DIR/dist/" "$PUBLIC_DIR/"

echo "[4/5] Configurando Nginx com API_UPSTREAM=$API_UPSTREAM"
sudo tee "/etc/nginx/conf.d/${NGINX_SITE}.conf" >/dev/null <<EOF
server {
  listen 80;
  server_name _;
  root $PUBLIC_DIR;
  index index.html;

  location /api/ {
    proxy_pass ${API_UPSTREAM}/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
EOF

echo "[5/5] Reiniciando Nginx"
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

if [[ "$DISABLE_EC2_BACKEND" == "true" ]]; then
  echo "Desativando backend na EC2 (PM2)..."
  if pm2 describe logiwms-api >/dev/null 2>&1; then
    pm2 stop logiwms-api || true
    pm2 delete logiwms-api || true
    pm2 save || true
  fi
fi

echo
echo "Deploy frontend-only concluido."
echo "- Frontend: http://<EC2_PUBLIC_IP>"
echo "- API upstream atual: $API_UPSTREAM"
echo "- Para trocar API depois: API_UPSTREAM=http://<novo-host>:3001 ./deploy-ec2-frontend-only.sh"
