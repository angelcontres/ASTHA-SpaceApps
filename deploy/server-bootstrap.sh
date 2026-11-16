#!/usr/bin/env bash
# Idempotent bootstrap script for a fresh Ubuntu/Debian AWS Lightsail or EC2 host.
# Prepares Docker Engine, Docker Compose plugin, firewall rules (22/80/443), and /opt/astha.
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/astha}"
DEPLOY_USER="${DEPLOY_USER:-$USER}"
ENABLE_UFW="${ENABLE_UFW:-1}"

if command -v apt-get >/dev/null 2>&1; then
  . /etc/os-release
  OS_ID="${ID:-ubuntu}"
  CODENAME="${VERSION_CODENAME:-noble}"

  echo "==> Updating apt packages and installing prerequisites (${OS_ID}/${CODENAME})..."
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl gnupg

  if ! command -v docker >/dev/null 2>&1; then
    echo "==> Installing Docker Engine + Compose plugin..."
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL "https://download.docker.com/linux/${OS_ID}/gpg" | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${OS_ID} \
      ${CODENAME} stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi

  if [ "${ENABLE_UFW}" = "1" ]; then
    echo "==> Configuring UFW firewall (22/tcp, 80/tcp, 443/tcp, 443/udp)..."
    sudo apt-get install -y ufw
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 443/udp
    sudo ufw --force enable
  fi
elif command -v dnf >/dev/null 2>&1; then
  echo "==> Installing Docker + Compose plugin via dnf..."
  sudo dnf install -y docker
  if ! docker compose version >/dev/null 2>&1; then
    sudo mkdir -p /usr/local/lib/docker/cli-plugins
    ARCH=$(uname -m)
    [ "$ARCH" = "x86_64" ] || ARCH="aarch64"
    sudo curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  fi
else
  echo "Unsupported package manager: install Docker and docker-compose-plugin manually." >&2
  exit 1
fi

echo "==> Adding ${DEPLOY_USER} to docker group..."
sudo usermod -aG docker "${DEPLOY_USER}"

echo "==> Enabling Docker service on boot..."
sudo systemctl enable --now docker

echo "==> Creating ${DEPLOY_DIR} workspace..."
sudo mkdir -p "${DEPLOY_DIR}/deploy"
sudo chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_DIR}"

cat <<EOF

Bootstrap complete!
Next steps:
  1. Ensure your GitHub Actions self-hosted runner (Linux X64) is running on this host.
  2. (Recommended for HTTPS) In GitHub -> Settings -> Secrets and variables -> Actions -> Variables:
     - ASTHA_DOMAIN = <Your domain or nip.io/sslip.io host, e.g. astha.yourdomain.com> (enables automatic HTTPS via Caddy)
     - DEPLOY_DIR   = ${DEPLOY_DIR} (optional, defaults to /opt/astha)
EOF
