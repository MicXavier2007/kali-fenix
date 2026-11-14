#!/usr/bin/env bash
set -Eeuo pipefail

# Kali Fenix workstation bootstrap for a dedicated Kali Rolling VM.
# Run as root on a fresh Kali Rolling VM. This installs the official
# kali-linux-everything metapackage, XFCE, XRDP, SSH and a host firewall.

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute como root: sudo env GUACAMOLE_HOST_IP=... FENIX_TARGET_CIDRS=... FENIX_DNS_SERVERS=... $0" >&2
  exit 1
fi

if [[ ! -r /etc/os-release ]]; then
  echo "Não foi possível identificar o sistema operacional." >&2
  exit 1
fi
# shellcheck disable=SC1091
. /etc/os-release
if [[ "${ID:-}" != "kali" ]]; then
  echo "Este instalador exige Kali Linux. Sistema detectado: ${PRETTY_NAME:-desconhecido}." >&2
  exit 1
fi

: "${GUACAMOLE_HOST_IP:?Informe o IP privado do servidor Apache Guacamole.}"
: "${FENIX_DNS_SERVERS:?Informe DNS resolvers em FENIX_DNS_SERVERS, separados por vírgula.}"
FENIX_ADMIN_USER="${FENIX_ADMIN_USER:-fenixops}"
FENIX_TARGET_CIDRS="${FENIX_TARGET_CIDRS:-}"

if ! [[ "$FENIX_ADMIN_USER" =~ ^[a-z_][a-z0-9_-]{0,30}$ ]]; then
  echo "FENIX_ADMIN_USER contém caracteres inválidos." >&2
  exit 1
fi

python3 - "$GUACAMOLE_HOST_IP" "$FENIX_TARGET_CIDRS" "$FENIX_DNS_SERVERS" <<'PY'
import ipaddress, sys
ipaddress.ip_address(sys.argv[1])
metadata = [ipaddress.ip_network("169.254.169.254/32"), ipaddress.ip_network("100.100.100.200/32"), ipaddress.ip_network("169.254.170.2/32"), ipaddress.ip_network("fd00:ec2::254/128")]
for raw in filter(None, (x.strip() for x in sys.argv[2].split(','))):
    network = ipaddress.ip_network(raw, strict=False)
    if network.prefixlen == 0:
        raise SystemExit("Não é permitido liberar a rota padrão (0.0.0.0/0 ou ::/0). Informe CIDRs específicos do escopo.")
    if any(network.version == blocked.version and network.overlaps(blocked) for blocked in metadata):
        raise SystemExit(f"CIDR inclui endpoint de metadados de nuvem bloqueado: {network}")
for raw in filter(None, (x.strip() for x in sys.argv[3].split(','))):
    ip = ipaddress.ip_address(raw)
    if ip in [net.network_address for net in metadata]:
        raise SystemExit(f"DNS aponta para endpoint de metadados bloqueado: {ip}")
PY

cat <<'NOTICE'

KALI FENIX — PREPARAÇÃO DA ESTAÇÃO KALI

Este processo instala o metapacote oficial kali-linux-everything, que agrega
uma quantidade muito grande de ferramentas e dependências do Kali. A instalação
pode consumir bastante armazenamento, memória, banda e tempo.

A estação terá terminal nativo e interface gráfica. Não haverá aprovação por IA
nem perfis artificiais de comandos. O firewall do sistema, porém, permitirá
tráfego de saída somente para os CIDRs de escopo configurados pela administração.

NOTICE
read -r -p "Digite INSTALAR para continuar: " answer
if [[ "$answer" != "INSTALAR" ]]; then
  echo "Instalação cancelada."
  exit 0
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get full-upgrade -y
apt-get install -y --no-install-recommends \
  kali-linux-everything \
  kali-desktop-xfce \
  xrdp \
  openssh-server \
  ufw \
  sudo \
  ca-certificates \
  dbus-x11

if ! id "$FENIX_ADMIN_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "Fenix Red Team Administrator" "$FENIX_ADMIN_USER"
fi
usermod -aG sudo "$FENIX_ADMIN_USER"

# Create an XFCE session for XRDP logins.
cat > /etc/xrdp/startwm.sh <<'XSTART'
#!/bin/sh
unset DBUS_SESSION_BUS_ADDRESS
unset XDG_RUNTIME_DIR
exec startxfce4
XSTART
chmod 0755 /etc/xrdp/startwm.sh

# SSH remains available only to the Guacamole host and uses public-key auth.
install -d -m 0755 /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/90-fenix-redteam.conf <<EOF_SSH
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
AllowUsers ${FENIX_ADMIN_USER}
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
EOF_SSH

systemctl enable ssh
systemctl enable xrdp
systemctl restart ssh
systemctl restart xrdp

# The firewall is host-side, not a browser checkbox. It allows the Guacamole
# host to reach SSH/RDP and allows outbound network traffic only to the
# explicitly listed target CIDRs and DNS resolvers.
ufw --force reset
ufw default deny incoming
ufw default deny outgoing
ufw allow from "$GUACAMOLE_HOST_IP" to any port 22 proto tcp comment 'Kali Fenix Guacamole SSH'
ufw allow from "$GUACAMOLE_HOST_IP" to any port 3389 proto tcp comment 'Kali Fenix Guacamole RDP'

IFS=',' read -r -a target_ranges <<< "$FENIX_TARGET_CIDRS"
for cidr in "${target_ranges[@]}"; do
  cidr="$(echo "$cidr" | xargs)"
  [[ -z "$cidr" ]] && continue
  ufw allow out to "$cidr" comment 'Kali Fenix approved assessment scope'
done

IFS=',' read -r -a dns_servers <<< "$FENIX_DNS_SERVERS"
for dns in "${dns_servers[@]}"; do
  dns="$(echo "$dns" | xargs)"
  [[ -z "$dns" ]] && continue
  ufw allow out to "$dns" port 53 proto udp comment 'Fenix DNS resolver'
  ufw allow out to "$dns" port 53 proto tcp comment 'Fenix DNS resolver TCP'
done

ufw logging low
ufw --force enable

cat <<EOF_DONE

Instalação concluída.

Usuário administrador: ${FENIX_ADMIN_USER}
Defina agora uma senha local com:
  passwd ${FENIX_ADMIN_USER}

Adicione a chave pública SSH do administrador em:
  /home/${FENIX_ADMIN_USER}/.ssh/authorized_keys

Ajuste permissões da chave:
  chown -R ${FENIX_ADMIN_USER}:${FENIX_ADMIN_USER} /home/${FENIX_ADMIN_USER}/.ssh
  chmod 700 /home/${FENIX_ADMIN_USER}/.ssh
  chmod 600 /home/${FENIX_ADMIN_USER}/.ssh/authorized_keys

Conecte o Guacamole ao IP privado desta VM:
  RDP: TCP 3389
  SSH: TCP 22

CIDRs liberados para saída: ${FENIX_TARGET_CIDRS:-nenhum}
DNS: ${FENIX_DNS_SERVERS}

Para adicionar um novo escopo, a administração deve adicionar uma regra UFW
'exact CIDR' e documentar o ativo e a janela de trabalho. Nenhuma IA participa
na aprovação ou execução dos comandos da estação.

EOF_DONE
