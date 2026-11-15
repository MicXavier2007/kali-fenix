(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const state = { tools: [], page: 1, pageSize: 36, loaded: false, inventory: null };
  const search = $('#tool-search');
  const categorySelect = $('#tool-category');
  const results = $('#catalog-results');
  const status = $('#catalog-status');
  const count = $('#catalog-count');
  const pageLabel = $('#page-label');
  const previous = $('#page-prev');
  const next = $('#page-next');
  const refresh = $('#catalog-refresh');

  const GROUPS = {
    'Reconhecimento e OSINT': ['0trace','amass','assetfinder','autorecon','dnsenum','dnsrecon','dnsx','fierce','finalrecon','gobuster','masscan','naabu','netdiscover','nmap','recon-ng','reconspider','sherlock','spiderfoot','subfinder','theharvester','whatweb','whois','arjun','hakrawler','httpx-toolkit','katana'],
    'Segurança de aplicações web': ['burpsuite','caido','commix','dalfox','dirb','dirbuster','dirsearch','ffuf','feroxbuster','nikto','nuclei','sqlmap','wapiti','watobo','wfuzz','wpscan','xsstrike','zaproxy','skipfish','joomscan','sstimap'],
    'Redes e análise de tráfego': ['arp-scan','bettercap','ettercap','hping3','mitmproxy','netexec','netsniff-ng','tcpdump','tcpflow','wireshark','dsniff','socat','masscan','nmap','sslscan'],
    'Senhas e autenticação': ['hashcat','john','hydra','medusa','ncrack','ophcrack','patator','crunch','cewl','fcrackzip','hash-identifier','name-that-hash','ophcrack'],
    'Forense e recuperação': ['autopsy','binwalk','dc3dd','foremost','hashdeep','plaso','scalpel','sleuthkit','testdisk','bulk-extractor','exifprobe','rifiuti2','volatility3'],
    'Engenharia reversa': ['apktool','ghidra','jadx','radare2','rizin','gdb','gef','gdb-peda','edb-debugger','dex2jar','bytecode-viewer','imhex'],
    'Wireless e hardware': ['aircrack-ng','airgeddon','bully','kismet','reaver','wifite','wifiphisher','hackrf','gnuradio','ubertooth','proxmark3','rfcat','bettercap','hcxtools'],
    'Exploração e validação': ['metasploit-framework','exploitdb','pocsuite3','routersploit','searchsploit','commix','nuclei','sqlmap'],
    'Análise de arquivos e código': ['gitleaks','yara','trufflehog','syft','trivy','semgrep','checksec','binwalk','strings','git','curl','jq']
  };

  const INFO = {
    'nmap': ['Reconhecimento e OSINT','Mapeia hosts e serviços em redes, identificando portas e versões de serviço.','Pode exigir privilégios para certos tipos de descoberta; execute somente em ativos do escopo.'],
    'masscan': ['Reconhecimento e OSINT','Scanner de portas de alta velocidade para inventário de grandes faixas de rede.','Gera tráfego elevado; use apenas em redes com autorização explícita e limites definidos.'],
    'amass': ['Reconhecimento e OSINT','Mapeia ativos e subdomínios para descoberta de superfície externa.','Algumas fontes exigem chaves de API.'],
    'assetfinder': ['Reconhecimento e OSINT','Ajuda a localizar domínios relacionados e subdomínios.','Resultados dependem de fontes públicas disponíveis.'],
    'subfinder': ['Reconhecimento e OSINT','Descoberta passiva de subdomínios a partir de fontes públicas.','Algumas fontes podem exigir tokens.'],
    'theharvester': ['Reconhecimento e OSINT','Reúne informações públicas sobre domínios, e-mails, hosts e nomes.','Algumas fontes exigem chaves e podem ter cotas.'],
    'dnsrecon': ['Reconhecimento e OSINT','Executa enumeração e verificações de configurações DNS.','Use no domínio designado ou em laboratório.'],
    'whois': ['Reconhecimento e OSINT','Consulta dados públicos de registro de domínios e endereços IP.','Depende de serviços WHOIS/RDAP acessíveis.'],
    'burpsuite': ['Segurança de aplicações web','Proxy de interceptação e conjunto de ferramentas para avaliar aplicações web.','Community Edition é gratuita; recursos variam por edição.'],
    'caido': ['Segurança de aplicações web','Plataforma de interceptação e análise de tráfego HTTP para testes web.','Verifique a edição e os recursos disponíveis.'],
    'zaproxy': ['Segurança de aplicações web','Proxy e scanner de segurança para aplicações web, mantido pelo OWASP.','Scans ativos devem ficar restritos a laboratórios e ativos autorizados.'],
    'sqlmap': ['Segurança de aplicações web','Automatiza detecção e validação de SQL injection.','Ferramenta intrusiva: execute somente contra aplicações autorizadas.'],
    'xsstrike': ['Segurança de aplicações web','Analisa possíveis vetores de Cross-Site Scripting (XSS).','Valide apenas em aplicações de laboratório ou sob autorização.'],
    'ffuf': ['Segurança de aplicações web','Fuzzer web para descoberta de caminhos, parâmetros e conteúdo.','Ajuste taxa e escopo para evitar impacto no serviço.'],
    'gobuster': ['Segurança de aplicações web','Enumera diretórios, arquivos, DNS e outros recursos configuráveis.','A enumeração pode gerar muitas requisições.'],
    'nikto': ['Segurança de aplicações web','Verifica configurações e problemas comuns em servidores web.','Pode gerar tráfego perceptível e falsos positivos.'],
    'wpscan': ['Segurança de aplicações web','Avalia instalações WordPress, componentes e configurações conhecidas.','Algumas funcionalidades dependem de token; respeite o escopo.'],
    'nuclei': ['Segurança de aplicações web','Executa verificações baseadas em templates para identificar exposições conhecidas.','Revise templates, taxa e impacto antes de executar.'],
    'hashcat': ['Senhas e autenticação','Ferramenta de auditoria de hashes com suporte a CPU e GPU.','GPU compatível pode acelerar muito o processamento.'],
    'john': ['Senhas e autenticação','Audita a robustez de senhas por análise de hashes.','Utilize hashes de laboratório ou fornecidos para auditoria.'],
    'hydra': ['Senhas e autenticação','Testa a resistência de autenticação em serviços suportados.','Tentativas de login podem bloquear contas; use limites e autorização.'],
    'wireshark': ['Redes e análise de tráfego','Analisa capturas de pacotes e protocolos de rede.','Captura ao vivo pode exigir privilégios e interface de rede.'],
    'tcpdump': ['Redes e análise de tráfego','Captura e filtra tráfego de rede pela linha de comando.','Captura ao vivo normalmente exige privilégios de rede.'],
    'mitmproxy': ['Redes e análise de tráfego','Proxy interceptador para inspecionar e modificar tráfego HTTP(S).','Use apenas em dispositivos e sessões de teste sob seu controle.'],
    'bettercap': ['Redes e análise de tráfego','Framework para auditoria de redes e análise de protocolos.','Algumas funções exigem privilégios e interfaces específicas.'],
    'aircrack-ng': ['Wireless e hardware','Conjunto de ferramentas para auditoria de redes Wi-Fi.','Exige adaptador Wi-Fi compatível com modo monitor/injeção; VPS comum não oferece isso.'],
    'wifite': ['Wireless e hardware','Automatiza etapas de auditoria de redes sem fio.','Exige adaptador compatível e ambiente de laboratório autorizado.'],
    'kismet': ['Wireless e hardware','Sistema de detecção e análise de redes sem fio.','Depende de hardware de rádio compatível.'],
    'ghidra': ['Engenharia reversa','Framework de engenharia reversa para análise de binários.','Aplicação gráfica; exige memória e desktop adequados.'],
    'radare2': ['Engenharia reversa','Framework de análise de binários e engenharia reversa.','Exige conhecimento de arquitetura e formato de executáveis.'],
    'jadx': ['Engenharia reversa','Decompila aplicativos Android para visualização do código.','Java/JVM e memória adicional podem ser necessários.'],
    'apktool': ['Engenharia reversa','Desmonta e recompõe recursos de pacotes Android.','Use em APKs próprios ou autorizados.'],
    'metasploit-framework': ['Exploração e validação','Framework para desenvolvimento e validação de provas de conceito de segurança.','Use módulos e alvos apenas em laboratório ou escopo autorizado.'],
    'exploitdb': ['Exploração e validação','Arquivo pesquisável de referências públicas a vulnerabilidades e provas de conceito.','Leia e valide a aplicabilidade antes de qualquer teste.'],
    'autopsy': ['Forense e recuperação','Interface gráfica para investigações forenses digitais.','Pode exigir bastante armazenamento para imagens de disco.'],
    'binwalk': ['Forense e recuperação','Analisa firmware e identifica arquivos ou estruturas incorporadas.','Arquivos grandes exigem espaço temporário.'],
    'foremost': ['Forense e recuperação','Recupera arquivos por assinaturas em imagens e dispositivos.','A recuperação deve gravar em outro volume para preservar a evidência.'],
    'sleuthkit': ['Forense e recuperação','Ferramentas de linha de comando para análise de sistemas de arquivos.','Trabalhe sobre cópias forenses quando possível.'],
    'testdisk': ['Forense e recuperação','Ajuda a recuperar partições e estruturas de disco.','Operações de escrita podem alterar discos; revise o alvo antes.'],
    'gitleaks': ['Análise de arquivos e código','Procura segredos e credenciais expostos em repositórios Git.','Execute em repositórios próprios ou autorizados.'],
    'yara': ['Análise de arquivos e código','Classifica arquivos por regras baseadas em padrões.','As regras devem ser confiáveis e revisadas.'],
    'trivy': ['Análise de arquivos e código','Analisa imagens, sistemas de arquivos e dependências em busca de vulnerabilidades e configurações fracas.','Atualize a base de vulnerabilidades e revise resultados.'],
    'trufflehog': ['Análise de arquivos e código','Procura credenciais e segredos em repositórios e fontes de dados.','Cuidado para não expor segredos nos relatórios.']
  };

  function categoryFor(tool) {
    for (const [category, slugs] of Object.entries(GROUPS)) {
      if (slugs.includes(tool.slug)) return category;
    }
    return 'Outras ferramentas';
  }

  function metaFor(tool) {
    const data = INFO[tool.slug];
    if (data) return { category: data[0], summary: data[1], requirement: data[2] };
    const category = categoryFor(tool);
    return {
      category,
      summary: 'Consulte a documentação oficial do Kali para conhecer os recursos, pacotes e comandos associados a esta ferramenta.',
      requirement: 'A disponibilidade depende do pacote, da arquitetura e das dependências da estação.'
    };
  }

  const showMessage = message => {
    if (!results) return;
    results.replaceChildren();
    const box = document.createElement('div');
    box.className = 'empty-state';
    box.textContent = message;
    results.appendChild(box);
  };

  function populateCategories() {
    if (!categorySelect) return;
    const categories = [...new Set(state.tools.map(tool => metaFor(tool).category))].sort((a,b) => a.localeCompare(b,'pt-BR'));
    const current = categorySelect.value;
    categorySelect.replaceChildren(new Option('Todas as categorias', ''));
    for (const category of categories) categorySelect.add(new Option(category, category));
    categorySelect.value = categories.includes(current) ? current : '';
  }

  function renderCatalog() {
    if (!results) return;
    const query = (search?.value || '').trim().toLocaleLowerCase('pt-BR');
    const category = categorySelect?.value || '';
    const filtered = state.tools.filter(tool => {
      const meta = metaFor(tool);
      const haystack = `${tool.name} ${tool.slug} ${meta.category} ${meta.summary} ${meta.requirement}`.toLocaleLowerCase('pt-BR');
      return haystack.includes(query) && (!category || meta.category === category);
    });
    const pages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    state.page = Math.min(Math.max(1, state.page), pages);
    const start = (state.page - 1) * state.pageSize;
    const visible = filtered.slice(start, start + state.pageSize);
    if (count) count.textContent = `${filtered.length.toLocaleString('pt-BR')} ferramenta(s)${query || category ? ' encontrada(s)' : ' no catálogo'}`;
    if (pageLabel) pageLabel.textContent = `Página ${state.page} de ${pages}`;
    if (previous) previous.disabled = state.page <= 1;
    if (next) next.disabled = state.page >= pages;
    results.replaceChildren();
    if (!visible.length) {
      showMessage(state.loaded ? 'Nenhuma ferramenta corresponde aos filtros.' : 'Aguardando catálogo oficial.');
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'tool-grid';
    for (const tool of visible) {
      let url;
      try { url = new URL(tool.url); } catch { continue; }
      if (url.protocol !== 'https:' || url.hostname !== 'www.kali.org' || !url.pathname.startsWith('/tools/')) continue;
      const meta = metaFor(tool);
      const card = document.createElement('a');
      card.className = 'tool-card'; card.href = url.href; card.target = '_blank'; card.rel = 'noopener noreferrer';
      const title = document.createElement('strong'); title.textContent = tool.name || tool.slug;
      const slug = document.createElement('code'); slug.textContent = tool.slug;
      const group = document.createElement('span'); group.className = 'tool-category'; group.textContent = meta.category;
      const summary = document.createElement('small'); summary.className = 'tool-summary'; summary.textContent = meta.summary;
      const requirement = document.createElement('small'); requirement.className = 'tool-requirement'; requirement.textContent = meta.requirement;
      const link = document.createElement('span'); link.textContent = 'Documentação oficial ↗';
      card.append(title, slug, group, summary, requirement, link);
      grid.appendChild(card);
    }
    results.appendChild(grid);
  }

  async function loadCatalog() {
    if (!refresh) return;
    const previousText = refresh.textContent;
    refresh.disabled = true; refresh.textContent = 'Sincronizando…';
    if (status) status.textContent = 'Consultando o catálogo oficial do Kali Linux…';
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 16000);
      let response;
      try {
        response = await fetch('/.netlify/functions/kali-catalog', {
          method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store', credentials: 'omit', signal: controller.signal
        });
      } finally { window.clearTimeout(timer); }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      if (!Array.isArray(data.tools) || data.tools.length === 0) throw new Error('O catálogo oficial não retornou ferramentas.');
      state.tools = data.tools.filter(item => item && typeof item.name === 'string' && typeof item.slug === 'string' && typeof item.url === 'string');
      state.page = 1; state.loaded = true; populateCategories();
      const synced = data.syncedAt ? new Date(data.syncedAt) : null;
      if (status) status.textContent = synced && !Number.isNaN(synced.getTime())
        ? `Catálogo sincronizado com kali.org em ${synced.toLocaleString('pt-BR')}.`
        : 'Catálogo oficial sincronizado.';
      renderCatalog();
    } catch (error) {
      if (status) status.textContent = 'Não foi possível sincronizar o catálogo agora.';
      showMessage(`${error.name === 'AbortError' ? 'A consulta excedeu o tempo limite.' : (error.message || 'Erro de conexão.')} Consulte kali.org/tools/all-tools/.`);
      if (count) count.textContent = 'Catálogo indisponível';
    } finally { refresh.disabled = false; refresh.textContent = previousText; }
  }

  // Package names that can be matched confidently in dpkg-query exports.
  const PACKAGE_ALIASES = {
    'metasploit-framework':['metasploit-framework'], 'burpsuite':['burpsuite'], 'zaproxy':['zaproxy'],
    'aircrack-ng':['aircrack-ng'], 'hashcat':['hashcat'], 'john':['john','john-data'],
    'hydra':['hydra'], 'wireshark':['wireshark','wireshark-common'], 'nmap':['nmap'],
    'sqlmap':['sqlmap'], 'gobuster':['gobuster'], 'nikto':['nikto'], 'wpscan':['wpscan'],
    'ghidra':['ghidra'], 'jadx':['jadx'], 'apktool':['apktool'], 'binwalk':['binwalk'],
    'foremost':['foremost'], 'hashdeep':['hashdeep'], 'yara':['yara'], 'gitleaks':['gitleaks'],
    'tcpdump':['tcpdump'], 'mitmproxy':['mitmproxy'], 'bettercap':['bettercap'], 'kismet':['kismet'],
    'testdisk':['testdisk'], 'sleuthkit':['sleuthkit'], 'autopsy':['autopsy'], 'amass':['amass'],
    'subfinder':['subfinder'], 'theharvester':['theharvester'], 'ffuf':['ffuf'], 'feroxbuster':['feroxbuster'],
    'masscan':['masscan'], 'massdns':['massdns'], 'nuclei':['nuclei'], 'trivy':['trivy'],
    'trufflehog':['trufflehog'], 'exploitdb':['exploitdb'], 'radare2':['radare2'], 'rizin':['rizin']
  };

  function parseInventory(text) {
    const packages = new Map();
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const parts = trimmed.split(/\t|,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(x => x.replace(/^"|"$/g, '').trim());
      const name = (parts[0] || '').toLowerCase().replace(/:[a-z0-9_-]+$/, '');
      const version = parts[1] || 'versão não informada';
      if (/^[a-z0-9][a-z0-9+_.:-]*$/.test(name) && name !== 'package') packages.set(name, version);
    }
    return packages;
  }

  function renderInventory(packages, filename) {
    const box = $('#inventory-results');
    const summary = $('#inventory-summary');
    const statusEl = $('#inventory-status');
    if (!box || !summary || !statusEl) return;
    const tracked = [];
    for (const tool of state.tools) {
      const aliases = PACKAGE_ALIASES[tool.slug];
      if (!aliases) continue;
      const found = aliases.map(alias => alias.toLowerCase()).find(alias => packages.has(alias));
      tracked.push({
        tool,
        packageName: found || aliases[0],
        version: found ? packages.get(found) : '—',
        installed: Boolean(found)
      });
    }
    const installedCount = tracked.filter(item => item.installed).length;
    const missingCount = tracked.length - installedCount;
    const otherPackages = packages.size;
    summary.replaceChildren();
    const stats = [
      ['Pacotes no inventário', otherPackages],
      ['Ferramentas reconhecidas', installedCount],
      ['Não localizadas no inventário', missingCount]
    ];
    for (const [label, value] of stats) {
      const item = document.createElement('div'); item.className='inventory-stat';
      const strong = document.createElement('strong'); strong.textContent = value.toLocaleString('pt-BR');
      const span = document.createElement('span'); span.textContent = label;
      item.append(strong, span); summary.appendChild(item);
    }
    statusEl.textContent = `Inventário “${filename}” processado localmente. Nenhum dado foi enviado ao Kali Fenix.`;
    box.replaceChildren();
    if (!tracked.length) {
      const empty=document.createElement('div'); empty.className='empty-state'; empty.textContent='O inventário foi lido, mas nenhum dos pacotes monitorados possui correspondência para este catálogo. Confira se o arquivo foi gerado com dpkg-query no sistema correto.'; box.appendChild(empty); return;
    }
    const table=document.createElement('table'); table.className='inventory-table';
    const thead=document.createElement('thead'); const hr=document.createElement('tr');
    for (const label of ['Ferramenta','Pacote encontrado','Versão','Estado']) { const th=document.createElement('th'); th.textContent=label; hr.appendChild(th); }
    thead.appendChild(hr); table.appendChild(thead);
    const tbody=document.createElement('tbody');
    for (const item of tracked.sort((a,b)=>Number(b.installed)-Number(a.installed) || a.tool.name.localeCompare(b.tool.name,'pt-BR'))) {
      const tr=document.createElement('tr');
      for (const value of [item.tool.name,item.packageName,item.version]) { const td=document.createElement('td'); if (value===item.packageName) { const code=document.createElement('code'); code.textContent=value; td.appendChild(code); } else td.textContent=value; tr.appendChild(td); }
      const td=document.createElement('td'); const badge=document.createElement('span'); badge.className=`inventory-badge ${item.installed ? 'installed' : 'unknown'}`; badge.textContent=item.installed ? 'Instalado' : 'Não encontrado'; td.appendChild(badge); tr.appendChild(td); tbody.appendChild(tr);
    }
    table.appendChild(tbody); box.appendChild(table);
    const note=document.createElement('p'); note.className='small-note'; note.textContent='A tabela mostra somente correspondências exatas conhecidas. A ausência de uma ferramenta nesta lista não comprova que ela não esteja instalada.'; box.appendChild(note);
  }

  const copyButton = $('#copy-inventory-command');
  copyButton?.addEventListener('click', async () => {
    const text = "dpkg-query -W -f='${binary:Package}\\t${Version}\\n' > fenix-inventory.tsv";
    try { await navigator.clipboard.writeText(text); copyButton.textContent='Copiado ✓'; }
    catch { copyButton.textContent='Copie o comando manualmente'; }
    window.setTimeout(() => { copyButton.textContent='Copiar comando'; }, 2200);
  });
  const fileInput = $('#inventory-file');
  const clearInventory = $('#inventory-clear');
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { $('#inventory-status').textContent='Arquivo acima de 2 MB. Exporte novamente um inventário menor.'; fileInput.value=''; return; }
    try {
      const text = await file.text();
      const packages = parseInventory(text);
      state.inventory = packages;
      renderInventory(packages, file.name);
      if (clearInventory) clearInventory.disabled=false;
    } catch { $('#inventory-status').textContent='Não foi possível ler o arquivo.'; }
  });
  clearInventory?.addEventListener('click', () => {
    state.inventory=null; if (fileInput) fileInput.value='';
    $('#inventory-status').textContent='Inventário removido da memória desta página.';
    $('#inventory-summary')?.replaceChildren();
    const box=$('#inventory-results'); if (box) { box.replaceChildren(); const empty=document.createElement('div'); empty.className='empty-state'; empty.textContent='O inventário aparecerá aqui após a importação.'; box.appendChild(empty); }
    clearInventory.disabled=true;
  });

  search?.addEventListener('input', () => { state.page = 1; renderCatalog(); });
  categorySelect?.addEventListener('change', () => { state.page = 1; renderCatalog(); });
  refresh?.addEventListener('click', loadCatalog);
  previous?.addEventListener('click', () => { state.page -= 1; renderCatalog(); });
  next?.addEventListener('click', () => { state.page += 1; renderCatalog(); });
  const year = $('#current-year'); if (year) year.textContent = String(new Date().getFullYear());

  // Remove service workers and caches from the retired FenixTools site.
  if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(regs => Promise.all(regs.map(r => r.unregister()))).catch(() => {});
  if ('caches' in window) caches.keys().then(keys => Promise.all(keys.filter(k => /arolax|fenix|fenixtools/i.test(k)).map(k => caches.delete(k)))).catch(() => {});
  loadCatalog();
})();
