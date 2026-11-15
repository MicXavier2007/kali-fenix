#!/usr/bin/env bash
set -Eeuo pipefail

# Kali Fenix Shell bootstrap for a dedicated Debian/Ubuntu/Kali server.
# Installs ttyd as an unprivileged user and binds it to loopback only.

if [[ "$EUID" -ne 0 ]]; then
  echo "Execute como root: sudo bash fenix-shell-vps.sh" >&2
  exit 1
fi
if [[ ! -r /etc/os-release ]]; then
  echo "Não foi possível identificar o sistema operacional." >&2
  exit 1
fi
. /etc/os-release
case "${ID:-}" in
  kali|debian|ubuntu) ;;
  *) echo "Sistema não suportado pelo instalador: ${PRETTY_NAME:-desconhecido}. Use Kali, Debian ou Ubuntu." >&2; exit 1 ;;
esac
if ! command -v systemctl >/dev/null 2>&1; then
  echo "Este instalador exige systemd." >&2
  exit 1
fi

ROOT_FREE_KB=$(df -Pk / | awk 'NR==2 {print $4}')
if [[ -z "$ROOT_FREE_KB" ]] || (( ROOT_FREE_KB < 300 * 1024 )); then
  echo "Espaço livre insuficiente. Reserve pelo menos 300 MiB para o ttyd e dependências." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ttyd
TTYD_BIN="$(command -v ttyd || true)"
if [[ -z "$TTYD_BIN" ]]; then
  echo "O pacote foi instalado, mas o executável ttyd não foi encontrado." >&2
  exit 1
fi

if ! id fenixshell >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash --user-group fenixshell
fi
install -d -o fenixshell -g fenixshell -m 0750 /home/fenixshell

cat > /etc/systemd/system/fenix-shell.service <<EOF_SERVICE
[Unit]
Description=Kali Fenix Shell (ttyd)
After=network.target

[Service]
Type=simple
User=fenixshell
Group=fenixshell
Environment=HOME=/home/fenixshell
WorkingDirectory=/home/fenixshell
ExecStart=${TTYD_BIN} --interface 127.0.0.1 --port 7681 --check-origin --writable /bin/bash -l
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true
CapabilityBoundingSet=
AmbientCapabilities=

[Install]
WantedBy=multi-user.target
EOF_SERVICE

systemctl daemon-reload
systemctl enable --now fenix-shell.service
systemctl is-active --quiet fenix-shell.service

cat <<'DONE'

Fenix Shell instalado.

O ttyd está vinculado somente a 127.0.0.1:7681 e roda como usuário sem privilégios 'fenixshell'.
Não abra a porta 7681 no firewall da VPS.

Acesso via túnel SSH a partir do seu computador:
  ssh -L 7681:127.0.0.1:7681 usuario@IP_DA_VPS
Depois abra:
  http://127.0.0.1:7681

Para acesso através do site Kali Fenix, coloque um proxy reverso HTTPS com autenticação por usuário/MFA na frente do serviço local e configure FENIX_SHELL_PORTAL_URL na Netlify. Não publique ttyd diretamente.

Gerenciamento:
  systemctl status fenix-shell
  journalctl -u fenix-shell -f
  systemctl restart fenix-shell
DONE
