#!/bin/bash
set -euxo pipefail

dnf update -y
dnf install -y git nginx rsync
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
npm install -g pm2

mkdir -p /var/www/logiwms
chown ec2-user:ec2-user /var/www/logiwms

systemctl enable nginx
systemctl start nginx
