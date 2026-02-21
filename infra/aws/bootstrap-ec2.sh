#!/bin/bash
set -euxo pipefail

apt update -y
apt install -y git nginx rsync
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

mkdir -p /var/www/logiwms
chown ubuntu:ubuntu /var/www/logiwms

systemctl enable nginx
systemctl start nginx
