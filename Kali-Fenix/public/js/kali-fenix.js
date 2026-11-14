(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const state = { tools: [], page: 1, pageSize: 48, loaded: false };
  const search = $('#tool-search');
  const results = $('#catalog-results');
  const status = $('#catalog-status');
  const count = $('#catalog-count');
  const pageLabel = $('#page-label');
  const previous = $('#page-prev');
  const next = $('#page-next');
  const refresh = $('#catalog-refresh');

  const showMessage = message => {
    results.replaceChildren();
    const box = document.createElement('div');
    box.className = 'empty-state';
    box.textContent = message;
    results.appendChild(box);
  };

  function renderCatalog() {
    if (!results) return;
    const query = (search?.value || '').trim().toLocaleLowerCase('pt-BR');
    const filtered = state.tools.filter(tool =>
      `${tool.name} ${tool.slug}`.toLocaleLowerCase('pt-BR').includes(query)
    );
    const pages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    state.page = Math.min(Math.max(1, state.page), pages);
    const start = (state.page - 1) * state.pageSize;
    const visible = filtered.slice(start, start + state.pageSize);

    count.textContent = `${filtered.length.toLocaleString('pt-BR')} ferramenta(s)${query ? ' encontrada(s)' : ' no catálogo'}`;
    pageLabel.textContent = `Página ${state.page} de ${pages}`;
    previous.disabled = state.page <= 1;
    next.disabled = state.page >= pages;
    results.replaceChildren();

    if (!visible.length) {
      showMessage(state.loaded ? 'Nenhuma ferramenta corresponde à pesquisa.' : 'Aguardando catálogo oficial.');
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'tool-grid';
    for (const tool of visible) {
      let url;
      try { url = new URL(tool.url); } catch { continue; }
      if (url.protocol !== 'https:' || url.hostname !== 'www.kali.org' || !url.pathname.startsWith('/tools/')) continue;
      const card = document.createElement('a');
      card.className = 'tool-card';
      card.href = url.href;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      const title = document.createElement('strong');
      title.textContent = tool.name || tool.slug;
      const slug = document.createElement('code');
      slug.textContent = tool.slug;
      const link = document.createElement('span');
      link.textContent = 'Documentação oficial ↗';
      card.append(title, slug, link);
      grid.appendChild(card);
    }
    results.appendChild(grid);
  }

  async function loadCatalog() {
    if (!refresh) return;
    const previousText = refresh.textContent;
    refresh.disabled = true;
    refresh.textContent = 'Sincronizando…';
    status.textContent = 'Consultando o catálogo oficial do Kali Linux…';
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 16000);
      let response;
      try {
        response = await fetch('/.netlify/functions/kali-catalog', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          credentials: 'omit',
          signal: controller.signal
        });
      } finally {
        window.clearTimeout(timer);
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      if (!Array.isArray(data.tools) || data.tools.length === 0) throw new Error('O catálogo oficial não retornou ferramentas.');
      state.tools = data.tools.filter(item => item && typeof item.name === 'string' && typeof item.slug === 'string' && typeof item.url === 'string');
      state.page = 1;
      state.loaded = true;
      const synced = data.syncedAt ? new Date(data.syncedAt) : null;
      status.textContent = synced && !Number.isNaN(synced.getTime())
        ? `Catálogo sincronizado com kali.org em ${synced.toLocaleString('pt-BR')}.`
        : 'Catálogo oficial sincronizado.';
      renderCatalog();
    } catch (error) {
      status.textContent = 'Não foi possível sincronizar o catálogo agora.';
      showMessage(`${error.name === 'AbortError' ? 'A consulta excedeu o tempo limite.' : (error.message || 'Erro de conexão.')} Você ainda pode consultar o catálogo diretamente em kali.org/tools/all-tools/.`);
      count.textContent = 'Catálogo indisponível';
    } finally {
      refresh.disabled = false;
      refresh.textContent = previousText;
    }
  }

  search?.addEventListener('input', () => { state.page = 1; renderCatalog(); });
  refresh?.addEventListener('click', loadCatalog);
  previous?.addEventListener('click', () => { state.page -= 1; renderCatalog(); });
  next?.addEventListener('click', () => { state.page += 1; renderCatalog(); });
  const year = $('#current-year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Unregister the previous FenixTools service worker and clear its obsolete caches.
  // This prevents removed pages and old logos from reappearing after the cleanup deploy.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
      .catch(() => {});
  }
  if ('caches' in window) {
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => /arolax|fenix|fenixtools/i.test(key)).map(key => caches.delete(key))))
      .catch(() => {});
  }

  loadCatalog();
})();
