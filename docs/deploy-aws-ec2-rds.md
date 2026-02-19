# Deploy AWS (EC2 ja existente + RDS)

Fluxo oficial para publicar o LogiWMS quando:
- a instancia EC2 ja foi criada;
- o deploy e manual;
- cada atualizacao usa novo `git clone` (sem `git pull` no script).

## Arquitetura
- Frontend build (`npm run build`) publicado em `/var/www/logiwms` e servido pelo Nginx.
- Backend Node (`api-backend/index.js`) gerenciado por PM2.
- Banco PostgreSQL em RDS.

## 1) Acesso na EC2

```bash
ssh -i <sua-chave.pem> ec2-user@100.27.33.178
```

## 2) Preparacao da maquina (somente primeira vez)

```bash
cd ~/logiwms-pro
chmod +x infra/aws/bootstrap-ec2.sh
sudo ./infra/aws/bootstrap-ec2.sh
```

O script apenas instala dependencias da maquina (Node, Nginx, PM2, rsync).
Nao ha script de criacao de instancia EC2 neste projeto.

## 3) Codigo da aplicacao (manual)

Para deploy novo em maquina limpa:

```bash
cd ~
git clone https://github.com/dmitrymarcelo/armazem.git logiwms-pro
cd logiwms-pro
```

Para atualizacao de versao (sem integracao automatica com GitHub):

```bash
cd ~
rm -rf logiwms-pro
git clone https://github.com/dmitrymarcelo/armazem.git logiwms-pro
cd logiwms-pro
```

## 3.1) Fluxo direto (repositorio ja clonado na EC2)

Se o `git clone` ja foi executado dentro da instancia EC2, use este passo a passo:

```bash
# 1) entrar no projeto
cd ~/logiwms-pro

# 2) garantir .env do backend
cat > api-backend/.env <<'EOF'
PORT=3001
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=armazem
DB_USER=dmitry
DB_PASSWORD=dmitry
DB_SSL=false
JWT_SECRET=troque-por-um-segredo-forte
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://100.27.33.178
EOF

# 3) instalar dependencias
npm ci
npm --prefix api-backend ci

# 4) validar banco e aplicar migration
npm --prefix api-backend run db:health
npm --prefix api-backend run db:migrate

# 5) build frontend
npm run build

# 6) publicar frontend no Nginx
sudo mkdir -p /var/www/logiwms
sudo rsync -a --delete ./dist/ /var/www/logiwms/
sudo tee /etc/nginx/conf.d/logiwms.conf >/dev/null <<'EOF'
server {
  listen 80;
  server_name 100.27.33.178;
  root /var/www/logiwms;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
EOF
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

# 7) subir backend no PM2 (apos frontend)
cd ~/logiwms-pro/api-backend
if pm2 describe logiwms-api >/dev/null 2>&1; then
  pm2 restart logiwms-api --update-env
else
  pm2 start index.js --name logiwms-api
fi
pm2 save
```

Atualizacao de versao permanece manual por novo clone (sem `git pull`):

```bash
cd ~
rm -rf logiwms-pro
git clone https://github.com/dmitrymarcelo/armazem.git logiwms-pro
```

## 4) Configurar backend (.env)

```bash
cp api-backend/.env.production.rds.example api-backend/.env
```

Preencha `api-backend/.env`:

```env
PORT=3001
NODE_ENV=production
DB_HOST=<RDS_ENDPOINT>
DB_PORT=5432
DB_NAME=armazem
DB_USER=dmitry
DB_PASSWORD=dmitry
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
JWT_SECRET=<SEGREDO_FORTE>
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://100.27.33.178
```

## 5) Executar deploy completo (frontend + backend)

```bash
cd ~/logiwms-pro
chmod +x deploy-ec2.sh
PROJECT_DIR=$PWD ./deploy-ec2.sh
```

Ordem interna do script:
1. `npm ci` (frontend)
2. `npm --prefix api-backend ci`
3. `npm --prefix api-backend run db:health`
4. `npm --prefix api-backend run db:migrate`
5. `npm run build` (frontend)
6. copia `dist/` para `/var/www/logiwms`
7. configura/reinicia Nginx
8. sobe/reinicia backend no PM2

## 5.1) Passo a passo manual (sem script)

```bash
cd ~/logiwms-pro

# Frontend + Nginx
npm ci
npm run build
sudo mkdir -p /var/www/logiwms
sudo rsync -a --delete ./dist/ /var/www/logiwms/
sudo tee /etc/nginx/conf.d/logiwms.conf >/dev/null <<'EOF'
server {
  listen 80;
  server_name _;
  root /var/www/logiwms;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
EOF
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

# Backend + PM2 (depois do frontend)
npm --prefix api-backend ci
npm --prefix api-backend run db:health
npm --prefix api-backend run db:migrate
cd api-backend
if pm2 describe logiwms-api >/dev/null 2>&1; then
  pm2 restart logiwms-api --update-env
else
  pm2 start index.js --name logiwms-api
fi
pm2 save
```

## 6) Validacao

```bash
curl http://100.27.33.178
curl http://100.27.33.178/api/health
pm2 status
pm2 logs logiwms-api --lines 100
sudo systemctl status nginx --no-pager
```

## Opcional: frontend-only na EC2

```bash
cd ~/logiwms-pro
chmod +x deploy-ec2-frontend-only.sh
API_UPSTREAM=http://SEU_BACKEND:3001 PROJECT_DIR=$PWD DISABLE_EC2_BACKEND=true ./deploy-ec2-frontend-only.sh
```
