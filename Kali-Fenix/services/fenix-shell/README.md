# Fenix Shell — implantação

A página `public/fenix-shell.html` reúne quatro caminhos: Fenix Local Engine (sem VPS), Fenix Browser Lab (Python WebAssembly), `ttyd` em destinos locais/remotos e portal remoto opcional.

## Opção A — Fenix Local Engine

O código está em `services/fenix-local-engine/` e o pacote para download público é `public/installers/fenix-local-engine.zip`.

- Python 3.10+ e biblioteca padrão; sem npm, Docker ou VPS.
- Escuta somente em `127.0.0.1:8765`.
- Token aleatório individual e allowlist de origens.
- Comandos de diagnóstico e arquivos confinados a `~/KaliFenixWorkspace`.
- Não é um shell irrestrito e não executa `sudo`, APT, comandos arbitrários nem operações de rede ofensivas.

Consulte `services/fenix-local-engine/README.md` para instalação, token e resolução de problemas.

## Opção B — Fenix Browser Lab

A página `public/fenix-browser-lab.html` usa Pyodide e WebAssembly para executar Python no próprio navegador, sem VPS ou instalação local. O runtime é carregado sob demanda do CDN oficial do Pyodide; a primeira abertura precisa de internet. O ambiente não é uma VM Kali e não pode executar comandos de sistema como Bash, APT ou Nmap.

## ttyd / VPS

A página continua oferecendo instruções para `ttyd`. Em VPS Kali/Debian/Ubuntu com systemd, execute:

```bash
sudo bash public/installers/fenix-shell-vps.sh
```

O serviço ttyd é executado como usuário sem privilégios e escuta somente em `127.0.0.1:7681`. Acesso local por túnel SSH:

```bash
ssh -L 7681:127.0.0.1:7681 usuario@IP_DA_VPS
```

Não exponha a porta ttyd diretamente à internet. Use HTTPS, proxy reverso, autenticação individual e MFA.

## Netlify

A função `/.netlify/functions/fenix-shell-portal` redireciona para o terminal remoto quando `FENIX_SHELL_PORTAL_URL` está configurada com uma URL HTTPS protegida. Sem essa variável, responde HTTP 503.
