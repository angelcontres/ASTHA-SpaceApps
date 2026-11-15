#!/usr/bin/env bash
# Idempotent bootstrap script for a fresh Ubuntu/Debian AWS Lightsail or EC2 host.
# Prepares Docker Engine, Docker Compose plugin, firewall rules (22/80/443), and /opt/astha.
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/astha}"
DEPLOY_USER="${DEPLOY_USER:-$USER}"

echo "==> Updating apt packages and installing prerequisites..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg ufw

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker Engine + Compose plugin..."
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

echo "==> Adding ${DEPLOY_USER} to docker group..."
sudo usermod -aG docker "${DEPLOY_USER}"

echo "==> Enabling Docker service on boot..."
sudo systemctl enable --now docker

echo "==> Creating ${DEPLOY_DIR} workspace..."
sudo mkdir -p "${DEPLOY_DIR}/deploy"
sudo chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_DIR}"

echo "==> Configuring UFW firewall (22/tcp, 80/tcp, 443/tcp, 443/udp)..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw --force enable

cat <<EOF

Bootstrap complete!
Next steps in GitHub -> Settings -> Secrets and variables -> Actions:
  Secrets:
    - SSH_HOST        = <Public IPv4 of this EC2/Lightsail instance>
    - SSH_USER        = ${DEPLOY_USER}
    - SSH_PRIVATE_KEY = <Private SSH key matching ~/.ssh/authorized_keys>
  Variables (optional):
    - ASTHA_DOMAIN    = <Your domain, e.g. astha.yourdomain.com> (enables automatic HTTPS via Caddy)
    - SSH_PORT        = 22
EOF
