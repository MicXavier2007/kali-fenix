# Fenix Shell — implantação

A página `public/fenix-shell.html` orienta a instalação do ttyd em diferentes destinos.

## Open source
- ttyd: https://github.com/tsl0922/ttyd (MIT)
- ttyd disponibiliza terminais no navegador via WebSocket e suporta autenticação básica/TLS; o Kali Fenix recomenda colocá-lo atrás de um proxy HTTPS com autenticação individual e MFA.

## Instalação VPS

Em uma VPS Kali/Debian/Ubuntu com systemd, execute:

```bash
sudo bash public/installers/fenix-shell-vps.sh
```

O serviço é executado como usuário sem privilégios `fenixshell` e escuta apenas em `127.0.0.1:7681`. Acesso local por túnel SSH:

```bash
ssh -L 7681:127.0.0.1:7681 usuario@IP_DA_VPS
```

Abra `http://127.0.0.1:7681` no computador que criou o túnel.

## Netlify

A função `/.netlify/functions/fenix-shell-portal` redireciona para o terminal remoto quando `FENIX_SHELL_PORTAL_URL` está configurada com uma URL HTTPS protegida. Sem essa variável, responde HTTP 503, sem simular um terminal.

Não coloque credenciais na URL nem exponha a porta ttyd diretamente à internet.

## Windows local

Instale com o script PowerShell `public/installers/fenix-shell-windows.ps1`, reabra o PowerShell e execute o comando indicado no script. O shell roda com as permissões do usuário atual.

## Pendrive Kali Live

A criação de uma mídia inicializável requer Rufus/Etcher e apaga o pendrive. Para persistência, siga a documentação oficial Kali. Recomenda-se planejar um pendrive de 16 GB ou mais para ter espaço de sistema e persistência; a documentação oficial descreve os requisitos e particionamento.
