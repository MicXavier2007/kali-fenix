(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const targets = {
    windows: {
      kicker:'LOCAL / WINDOWS', status:'Instalação local', title:'Windows — PowerShell local',
      description:'Instale o ttyd no Windows. O terminal será executado com as permissões da sua conta atual; não abra o PowerShell como administrador para uso cotidiano.',
      requirements:['Windows 10/11','WinGet disponível','Sem privilégio de administrador para o shell'],
      commands:'winget install --id tsl0922.ttyd --exact\n\n# Feche e reabra o PowerShell; depois execute:\nttyd.exe --interface 127.0.0.1 --port 7681 --writable powershell.exe',
      footnote:'Com o ttyd em execução, abra http://127.0.0.1:7681 neste mesmo computador. Para encerrar, pressione Ctrl+C na janela do PowerShell.',
      open:'http://127.0.0.1:7681', download:'/installers/fenix-shell-windows.ps1', guide:'https://github.com/tsl0922/ttyd'
    },
    linux: {
      kicker:'LOCAL / LINUX', status:'Instalação local', title:'Linux / Kali — Bash local',
      description:'Em Debian, Ubuntu ou Kali, instale o pacote ttyd e inicie uma sessão Bash vinculada somente ao loopback. Isso não instala o Kali Linux em uma distribuição diferente.',
      requirements:['Debian / Ubuntu / Kali','Acesso sudo para instalar','Shell executado como usuário atual'],
      commands:'sudo apt update\nsudo apt install -y ttyd\n\nttyd --interface 127.0.0.1 --port 7681 --writable bash -l',
      footnote:'Abra http://127.0.0.1:7681 no mesmo dispositivo. O serviço fica apenas em localhost e não deve ser exposto diretamente à internet.',
      open:'http://127.0.0.1:7681', guide:'https://github.com/tsl0922/ttyd'
    },
    usb: {
      kicker:'USB / KALI LIVE', status:'Requer pendrive', title:'Pendrive — Kali Live com persistência',
      description:'Crie um pendrive inicializável do Kali Live usando Rufus (Windows) ou Etcher. O processo de gravação apaga os dados do pendrive. Para persistência, siga o procedimento oficial de particionamento; não use comandos de formatação sem confirmar o dispositivo.',
      requirements:['Pendrive recomendado: 16 GB ou mais','Outro computador para gravar a ISO é recomendado','Backup do pendrive antes de começar'],
      commands:'# Depois de iniciar o Kali Live pelo pendrive:\nsudo apt update\nsudo apt install -y ttyd\n\nttyd --interface 127.0.0.1 --port 7681 --writable bash -l',
      footnote:'Abra http://127.0.0.1:7681 no computador que iniciou pelo USB. Para manter alterações entre reinicializações, configure a partição persistence conforme a documentação oficial. O notebook com apenas 5 GB livres não tem margem confortável para baixar a ISO.',
      open:'http://127.0.0.1:7681', guide:'https://www.kali.org/docs/usb/usb-persistence/'
    },
    vps: {
      kicker:'VPS / REMOTO', status:'Servidor externo', title:'VPS — serviço ttyd protegido',
      description:'Use o instalador do repositório para instalar ttyd como usuário sem privilégios e vincular o serviço a 127.0.0.1. Acesse por túnel SSH ou por proxy HTTPS com autenticação e MFA.',
      requirements:['Kali / Debian / Ubuntu x86-64 ou ARM compatível','Acesso administrativo para instalar o serviço','SSH ativo e HTTPS no gateway','Não abrir a porta 7681 publicamente'],
      commands:'# Baixe o instalador nesta página e envie para a VPS:\nscp fenix-shell-vps.sh usuario@IP_DA_VPS:~\nssh usuario@IP_DA_VPS \"sudo bash ~/fenix-shell-vps.sh\"\n\n# No seu computador, crie um túnel SSH:\nssh -L 7681:127.0.0.1:7681 usuario@IP_DA_VPS\n\n# Abra no navegador local:\nhttp://127.0.0.1:7681',
      footnote:'O serviço do ttyd roda como usuário fenixshell, sem sudo, e escuta apenas em localhost. Para abrir através do domínio do Kali Fenix, configure um proxy reverso HTTPS com autenticação individual/MFA e FENIX_SHELL_PORTAL_URL na Netlify.',
      open:'/.netlify/functions/fenix-shell-portal', download:'/installers/fenix-shell-vps.sh', guide:'https://github.com/tsl0922/ttyd'
    },
    cloud: {
      kicker:'CLOUD / TEMPORÁRIO', status:'Sessão temporária', title:'Cloud Shell — manutenção e desenvolvimento',
      description:'Use o Cloud Shell para editar o Kali Fenix, executar Git e scripts de desenvolvimento compatíveis com as regras do provedor. Ele não é uma VPS Kali permanente nem deve ser usado para varredura de rede.',
      requirements:['Conta Google','Cota de uso do Cloud Shell','Arquivos persistentes em $HOME','Não instalar Kali Everything'],
      commands:'# Reabrir o projeto persistido:\ncd ~/projetos/kali-fenix/Kali-Fenix\n\n# Sincronizar com o GitHub:\ngit pull --ff-only\n\n# Conferir o estado:\ngit status',
      footnote:'O Cloud Shell é temporário, tem limites de sessão e 5 GB de armazenamento persistente. Use-o para manutenção do projeto, não como terminal público ou VPS.',
      open:'https://shell.cloud.google.com/', guide:'https://cloud.google.com/shell/docs'
    }
  };

  const select = $('#shell-target');
  const commands = $('#target-commands');
  const copy = $('#copy-shell-command');
  const open = $('#target-open');
  const guide = $('#target-guide');
  const download = $('#target-download');
  function render(key) {
    const item = targets[key] || targets.windows;
    $('#target-kicker').textContent = item.kicker;
    $('#target-status').textContent = item.status;
    $('#target-title').textContent = item.title;
    $('#target-description').textContent = item.description;
    $('#target-footnote').textContent = item.footnote;
    commands.textContent = item.commands;
    open.href = item.open;
    open.textContent = key === 'vps' ? 'Conectar ao terminal remoto ↗' : key === 'cloud' ? 'Abrir Cloud Shell ↗' : 'Abrir terminal local ↗';
    guide.href = item.guide;
    if (download) {
      if (item.download) { download.href = item.download; download.hidden = false; }
      else { download.removeAttribute('href'); download.hidden = true; }
    }
    const list = $('#target-requirements'); list.replaceChildren();
    for (const req of item.requirements) { const span=document.createElement('span'); span.textContent=req; list.appendChild(span); }
    copy.textContent='Copiar comandos';
  }
  select?.addEventListener('change', () => render(select.value));
  copy?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(commands.textContent); copy.textContent='Copiado ✓'; }
    catch { copy.textContent='Selecione e copie o bloco'; }
    window.setTimeout(() => copy.textContent='Copiar comandos', 2200);
  });
  const year=$('#shell-year'); if (year) year.textContent=String(new Date().getFullYear());
  render(select?.value || 'windows');
})();
