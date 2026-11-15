# Kali Fenix Local Engine 1.0

Motor local opcional para conectar o site Kali Fenix ao computador do próprio usuário. Usa somente a biblioteca padrão do Python 3.10+; não exige Node.js, npm, Docker, VPS ou privilégios de administrador.

## O que faz

- Escuta somente em `127.0.0.1:8765` (não abre uma porta pública na rede).
- Exige um token aleatório individual, exibido no terminal ao iniciar.
- Aceita chamadas apenas do domínio oficial `https://kalifenix.netlify.app` e de origens locais de desenvolvimento listadas no código. A resposta CORS inclui `Access-Control-Allow-Private-Network` somente para essas origens autorizadas.
- Restringe arquivos a `~/KaliFenixWorkspace`.
- Executa somente comandos permitidos, sem `shell=True`, pipes, redirecionamento, encadeamento ou execução arbitrária.
- Aplica limite de tamanho de requisição, tempo de subprocessos e taxa de chamadas.

## Iniciar no Linux / Kali

1. Extraia o arquivo ZIP em uma pasta do seu usuário.
2. Abra um terminal nessa pasta.
3. Execute `./start-linux.sh` (se necessário: `chmod +x start-linux.sh`).
4. Copie o token mostrado no terminal.
5. Abra `https://kalifenix.netlify.app/fenix-shell.html`, cole o token em **Fenix Local Engine** e clique em **Conectar**.

Também é possível executar diretamente `python3 fenix_local_engine.py`.

## Iniciar no Windows

1. Instale Python 3.10+ caso ainda não esteja instalado.
2. Extraia o ZIP.
3. Clique duas vezes em `start-windows.bat`.
4. Copie o token exibido na janela.
5. Abra `https://kalifenix.netlify.app/fenix-shell.html`, cole o token e conecte.

## Acesso à rede local no Chrome / Edge

Como o site está hospedado em HTTPS e o motor fica em `127.0.0.1`, o navegador pode solicitar permissão para acesso à rede de loopback. O motor responde à pré-verificação CORS de rede privada e autoriza somente as origens da lista permitida. Autorize o acesso somente porque você iniciou o Fenix Local Engine e está acessando o domínio oficial. Se a permissão foi negada antes, reative o acesso à rede local nas configurações do site do navegador.

## Comandos disponíveis

`help`, `pwd`, `ls [caminho]`, `cd [pasta]`, `whoami`, `hostname`, `date`, `uname`, `df`, `mkdir NOME`, `touch ARQUIVO`, `cat ARQUIVO`, `python --version`, `git --version`, `ip addr`, `ip route` (quando disponíveis no Linux) e `clear`.

Os caminhos são confinados ao workspace `KaliFenixWorkspace` dentro da pasta pessoal do usuário. O motor não implementa `sudo`, APT, comandos arbitrários, varredura de rede, captura de tráfego ou acesso a arquivos fora do workspace. Para tarefas administrativas, use o terminal normal do seu próprio sistema e confira cada comando antes de executá-lo.

## Token

O token fica em:
- Linux: `~/.config/kali-fenix/engine.token`
- Windows: `%APPDATA%\KaliFenix\engine.token`

Para trocar o token, encerre o motor e execute `python3 fenix_local_engine.py --reset-token` (Windows: `py -3 fenix_local_engine.py --reset-token`). Não compartilhe o token.

## Configuração de origem

Para uma URL de preview ou domínio próprio, configure `FENIX_ALLOWED_ORIGINS` antes de iniciar o serviço, usando origens exatas separadas por vírgula. Exemplo Linux:

```bash
FENIX_ALLOWED_ORIGINS="https://seu-preview.netlify.app" python3 fenix_local_engine.py
```

Não use curingas ou `*`. O endereço deve permanecer HTTPS quando acessado a partir de um site público.

## Limite importante

Este serviço é um executor local de comandos de diagnóstico e arquivos do workspace, não um shell Bash/PowerShell irrestrito e não uma estação Kali remota. Não instale este motor em VPS pública nem altere o bind de `127.0.0.1`.
