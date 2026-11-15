(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const editor = $('python-editor');
  const output = $('python-output');
  const status = $('python-status');
  const runButton = $('python-run');
  const clearButton = $('python-clear');
  const saveButton = $('python-download');
  const restartButton = $('python-restart');
  const versionEl = $('python-version');
  let worker = null;
  let ready = false;
  let busy = false;

  function setStatus(text, state = 'loading') {
    status.textContent = text;
    status.dataset.state = state;
  }

  function append(type, text) {
    const line = document.createElement('div');
    line.className = `python-line python-line-${type}`;
    line.textContent = text;
    output.appendChild(line);
    while (output.childElementCount > 200) output.firstElementChild.remove();
    output.scrollTop = output.scrollHeight;
  }

  function updateButtons() {
    runButton.disabled = !ready || busy || !editor.value.trim();
    editor.disabled = busy;
    versionEl.textContent = ready ? 'PYTHON ONLINE' : 'CARREGANDO';
    versionEl.dataset.state = ready ? 'online' : 'loading';
  }

  function initialize() {
    if (!('Worker' in window) || !('WebAssembly' in window)) {
      setStatus('Este navegador não oferece suporte necessário a Web Workers e WebAssembly.', 'error');
      return;
    }
    setStatus('Preparando o ambiente Python. A primeira inicialização baixa os arquivos do Pyodide pelo CDN oficial.', 'loading');
    worker = new Worker('js/fenix-browser-worker.js', { type: 'module' });
    worker.addEventListener('message', (event) => {
      const data = event.data || {};
      switch (data.type) {
        case 'status':
          setStatus(data.message, 'loading');
          break;
        case 'ready':
          ready = true;
          versionEl.textContent = `PYTHON ${data.version}`;
          setStatus(data.message, 'success');
          append('system', `[${data.message}]`);
          append('system', 'Digite Python e pressione Executar ou Ctrl + Enter.');
          updateButtons();
          break;
        case 'stdout':
          append('output', data.text);
          break;
        case 'stderr':
          append('error', data.text);
          break;
        case 'result':
          append('result', data.text);
          break;
        case 'run-error':
          append('error', data.message);
          break;
        case 'init-error':
          ready = false;
          setStatus(`Não foi possível iniciar Python: ${data.message}. Verifique a conexão com o CDN e tente recarregar a página.`, 'error');
          updateButtons();
          break;
        case 'done':
          busy = false;
          updateButtons();
          break;
      }
    });
    worker.addEventListener('error', (event) => {
      setStatus(`Falha no Web Worker: ${event.message || 'erro desconhecido'}`, 'error');
      busy = false;
      updateButtons();
    });
  }

  function run() {
    if (!ready || busy || !editor.value.trim()) return;
    busy = true;
    append('prompt', '>>> executar código Python');
    worker.postMessage({ type: 'run', code: editor.value });
    updateButtons();
  }

  runButton.addEventListener('click', run);
  restartButton.addEventListener('click', () => {
    worker?.terminate();
    worker = null;
    ready = false;
    busy = false;
    versionEl.textContent = 'REINICIANDO';
    setStatus('Runtime reiniciado. Recarregando o ambiente Python…', 'loading');
    append('system', '[runtime reiniciado pelo usuário]');
    updateButtons();
    initialize();
  });
  clearButton.addEventListener('click', () => {
    output.replaceChildren();
    append('system', '[saída limpa — a sessão Python continua ativa]');
  });
  editor.addEventListener('input', updateButtons);
  editor.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      run();
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.setRangeText('    ', start, end, 'end');
      updateButtons();
    }
  });
  document.querySelectorAll('[data-python-example]').forEach((button) => {
    button.addEventListener('click', () => {
      editor.value = (button.dataset.pythonExample || '').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      updateButtons();
      editor.focus();
    });
  });
  saveButton.addEventListener('click', () => {
    const blob = new Blob([editor.value], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fenix-lab.py';
    link.click();
    URL.revokeObjectURL(url);
  });
  window.addEventListener('beforeunload', () => worker?.terminate());
  updateButtons();
  initialize();
})();
