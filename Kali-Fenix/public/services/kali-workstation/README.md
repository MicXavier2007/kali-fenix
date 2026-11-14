# Kali Fenix — Preparar a estação Kali

Este instalador prepara uma VM dedicada com Kali Rolling. O portal Netlify não é a máquina Kali: ele fornece o catálogo e o redirecionamento para uma sessão remota configurada separadamente.

## O que o instalador prepara

- Metapacote oficial `kali-linux-everything`;
- desktop XFCE;
- XRDP para desktop remoto pelo Guacamole;
- OpenSSH para terminal remoto pelo Guacamole;
- UFW com política de entrada/saída restritiva;
- uma conta administrativa Linux inicial.

O metapacote Everything é muito grande. Antes de instalar, execute uma simulação:

```bash
sudo apt update
sudo apt -s install kali-linux-everything kali-desktop-xfce xrdp openssh-server ufw
```

Confirme espaço de disco com margem para cache do APT e atualizações. Em uma VPS, confira se a arquitetura e o provedor suportam todos os pacotes necessários.

## Pré-requisitos

1. VM/VPS Kali Rolling provisionada, com acesso administrativo.
2. IP privado alcançável pelo host Guacamole.
3. DNS resolvers que a VM pode consultar.
4. CIDRs da rede de teste que a administração pretende liberar.
5. Guacamole com HTTPS, autenticação individual e MFA.

## Instalação

Execute como root dentro de Kali Rolling, substituindo os exemplos pelos endereços reais da infraestrutura:

```bash
sudo env \
  GUACAMOLE_HOST_IP="10.20.0.5" \
  FENIX_ADMIN_USER="fenixops" \
  FENIX_DNS_SERVERS="10.20.0.1,1.1.1.1" \
  FENIX_TARGET_CIDRS="203.0.113.10/32,198.51.100.0/28" \
  bash services/kali-workstation/install-kali-vm.sh
```

Os endereços acima são apenas exemplos reservados para documentação. Substitua-os. O instalador solicita a confirmação `INSTALAR`, atualiza o Kali, instala os pacotes e configura a rede.

Depois, defina a senha do usuário e adicione a chave pública SSH conforme as mensagens exibidas pelo instalador. Crie contas Linux individuais para demais funcionários e conceda `sudo` somente a quem precisa administrar a VM.

## Guacamole

Crie conexões RDP (3389) e SSH (22) apontando ao IP privado da VM. Mantenha SSH e RDP acessíveis somente pelo host Guacamole. Guarde credenciais no gerenciador de conexões; nunca no HTML, JavaScript, URL ou repositório.

## Ativar o portal Kali Fenix

Na Netlify, defina `FENIX_KALI_PORTAL_URL` com a URL HTTPS do Guacamole, por exemplo:

```text
https://kali.seudominio.com/guacamole/
```

Faça um novo deploy. O botão no Kali Fenix chama `/.netlify/functions/kali-portal`, que faz o redirecionamento ao portal autenticado.

## Rede e atualizações

A política de saída é administrada no firewall da VM e na infraestrutura. Planeje regras de rede específicas para repositórios/mirrors oficiais do Kali durante atualizações. Em janela de manutenção:

```bash
sudo apt update
sudo apt full-upgrade
sudo ufw status numbered
```

Não exponha SSH, RDP, VNC ou Docker diretamente à internet.

## Hardware especial

Ferramentas que dependem de Wi-Fi monitor mode, Bluetooth, SDR, USB, GPU ou módulos de kernel podem exigir hardware dedicado ou passthrough. Uma VPS comum pode não oferecer esses recursos.
