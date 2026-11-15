(() => {
  'use strict';
  const ENGINE_URL = 'http://127.0.0.1:8765';
  const $ = (id) => document.getElementById(id);
  const tokenInput = $('engine-token');
  const connectButton = $('engine-connect');
  const statusEl = $('engine-status');
  const terminalEl = $('engine-terminal-output');
  const commandInput = $('engine-command-input');
  const runButton = $('engine-run');
  const form = $('engine-command-form');
  const engineVersion = $('engine-version');
  let token = '';
  let connected = false;
  let busy = false;
  let cwd = '~/KaliFenixWorkspace';

  function setStatus(message, state = 'idle') {
    statusEl.textContent = message;
    statusEl.dataset.state = state;
  }

  function appendTerminal(kind, text) {
    const line = document.createElement('div');
    line.className = `engine-line engine-line-${kind}`;
    line.textContent = text;
    terminalEl.appendChild(line);
    while (terminalEl.childElementCount > 100) terminalEl.firstElementChild.remove();
    terminalEl.scrollTop = terminalEl.scrollHeight;
  }

  function updateControls() {
    runButton.disabled = !connected || busy || !commandInput.value.trim();
    commandInput.disabled = !connected || busy;
    engineVersion.textContent = connected ? 'CONECTADO' : 'DESCONECTADO';
    engineVersion.dataset.state = connected ? 'online' : 'offline';
    connectButton.textContent = connected ? 'Desconectar' : 'Conectar';
  }

  async function request(path, options = {}) {
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {})
    };
    const requestOptions = { ...options, mode: 'cors', cache: 'no-store', headers, targetAddressSpace: 'loopback' };
    const localRequest = new Request(`${ENGINE_URL}${path}`, requestOptions);
    const response = await fetch(localRequest);
    let payload;
    try { payload = await response.json(); }
    catch { throw new Error(`Resposta inválida do motor local (HTTP ${response.status}).`); }
    if (!response.ok) throw new Error(payload.error || `Falha HTTP ${response.status}.`);
    return payload;
  }

  async function connect() {
    if (connected) {
      connected = false;
      token = '';
      tokenInput.value = '';
      setStatus('Desconectado. O motor local continua em execução até você encerrá-lo no terminal.', 'idle');
      appendTerminal('info', '[sessão desconectada]');
      updateControls();
      return;
    }
    const candidate = tokenInput.value.trim();
    if (!candidate) {
      setStatus('Cole o token exibido na janela do Fenix Local Engine.', 'error');
      tokenInput.focus();
      return;
    }
    token = candidate;
    connectButton.disabled = true;
    if (navigator.permissions?.query) {
      try {
        const permission = await navigator.permissions.query({ name: 'loopback-network' });
        if (permission.state === 'denied') {
          token = '';
          setStatus('O navegador bloqueou o acesso de loopback. Abra as permissões do site kalifenix.netlify.app e permita o acesso à rede local/loopback; depois tente novamente.', 'error');
          connectButton.disabled = false;
          return;
        }
      } catch { /* Navegadores sem esse descritor tentam a conexão após o clique. */ }
    }
    setStatus('Solicitando conexão com 127.0.0.1:8765. O Chrome/Edge pode pedir permissão de acesso à rede local.', 'busy');
    try {
      const status = await request('/api/status');
      connected = true;
      cwd = status.cwd || status.workspace || cwd;
      setStatus(`Conectado em ${status.platform} · Python ${status.python} · Workspace: ${status.workspace}`, 'success');
      appendTerminal('success', `Fenix Local Engine ${status.version} conectado.`);
      appendTerminal('info', `Ambiente: ${status.platform}`);
      appendTerminal('info', `Workspace: ${status.workspace}`);
      appendTerminal('info', 'Digite help para consultar os comandos permitidos.');
      updateControls();
      commandInput.focus();
    } catch (error) {
      token = '';
      connected = false;
      let message = error.message || 'Não foi possível conectar.';
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        message = 'Não foi possível alcançar o motor local. Confirme se ele está aberto na máquina, se o token está correto e se o navegador autorizou o acesso à rede local/loopback para kalifenix.netlify.app.';
      }
      setStatus(message, 'error');
      updateControls();
    } finally {
      connectButton.disabled = false;
    }
  }

  async function runCommand(command) {
    if (!connected || busy || !command.trim()) return;
    const value = command.trim();
    if (value.toLowerCase() === 'clear') {
      terminalEl.replaceChildren();
      appendTerminal('info', '[terminal limpo]');
      commandInput.value = '';
      updateControls();
      return;
    }
    appendTerminal('prompt', `fenix@local:${cwd.replace(/^.*KaliFenixWorkspace/, '~')}$ ${value}`);
    busy = true;
    updateControls();
    try {
      const result = await request('/api/command', {
        method: 'POST',
        body: JSON.stringify({ command: value })
      });
      if (result.output === '__FENIX_CLEAR__') terminalEl.replaceChildren();
      else if (result.output) {
        appendTerminal('output', result.output);
        if (value.startsWith('cd ')) cwd = result.output;
        if (value === 'pwd') cwd = result.output;
      }
    } catch (error) {
      appendTerminal('error', error.message || 'Falha ao executar o comando.');
      if (error.message && error.message.includes('Token inválido')) {
        connected = false;
        token = '';
        setStatus('Token rejeitado. Desconectado.', 'error');
      }
    } finally {
      busy = false;
      commandInput.value = '';
      updateControls();
      commandInput.focus();
    }
  }

  connectButton.addEventListener('click', connect);
  commandInput.addEventListener('input', updateControls);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    runCommand(commandInput.value);
  });
  document.querySelectorAll('[data-engine-command]').forEach((button) => {
    button.addEventListener('click', () => {
      commandInput.value = button.dataset.engineCommand || '';
      updateControls();
      if (connected) runCommand(commandInput.value);
    });
  });
  updateControls();
})();
