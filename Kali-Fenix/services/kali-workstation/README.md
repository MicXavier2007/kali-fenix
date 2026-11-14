# Kali Fenix — Preparar a estação Kali

Este instalador deve ser executado somente dentro de uma VM/VPS que já esteja com Kali Rolling instalado. Ele NÃO cria uma VPS, não instala o Guacamole e não roda no notebook Windows.

## Antes de executar

- Confirme que a distribuição é Kali (`/etc/os-release` deve indicar `ID=kali`).
- Confirme arquitetura e compatibilidade dos pacotes necessários.
- Garanta espaço livre suficiente. Kali lista aproximadamente 34 GB para `kali-linux-everything` com XFCE e recomenda planejar cerca de 60 GB de disco no total.
- Tenha o IP privado do host Guacamole, endereços DNS e os CIDRs exatos do escopo aprovado.
- Leia o script antes de executar.

Faça uma simulação do tamanho:

```bash
sudo apt update
sudo apt -s install kali-linux-everything kali-desktop-xfce xrdp openssh-server ufw
```

## Executar

A partir da raiz do repositório já disponível na VM, ou depois de copiar o script para a VM:

```bash
sudo env \
  GUACAMOLE_HOST_IP="IP_PRIVADO_DO_GUACAMOLE" \
  FENIX_ADMIN_USER="fenixops" \
  FENIX_DNS_SERVERS="DNS_1,DNS_2" \
  FENIX_TARGET_CIDRS="CIDR_1,CIDR_2" \
  bash services/kali-workstation/install-kali-vm.sh
```

Substitua todos os exemplos por valores reais. O script exige `GUACAMOLE_HOST_IP` e `FENIX_DNS_SERVERS`; `FENIX_TARGET_CIDRS` pode ser vazio. Digite `INSTALAR` para confirmar.

O UFW é configurado com entrada e saída negadas por padrão. São liberadas as conexões de SSH/RDP do host Guacamole, consultas DNS e saída para os CIDRs declarados. Isso significa que os mirrors de pacotes e outros serviços externos podem exigir regras adicionais de saída; planeje-as antes das próximas atualizações.

Depois da instalação:

1. Defina a senha da conta: `sudo passwd fenixops`.
2. Adicione uma chave pública SSH em `/home/fenixops/.ssh/authorized_keys`.
3. Aplique permissões: diretório `.ssh` com `700` e `authorized_keys` com `600`, pertencentes ao usuário.
4. No Guacamole, crie conexões RDP (3389) e SSH (22) para o IP privado da VM.
5. Não exponha SSH/RDP diretamente à internet.
