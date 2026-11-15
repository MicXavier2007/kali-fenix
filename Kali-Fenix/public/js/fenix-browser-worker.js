import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v314.0.8/full/pyodide.mjs';

const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v314.0.8/full/';
let pyodide = null;

function send(type, payload = {}) {
  self.postMessage({ type, ...payload });
}

async function initialize() {
  try {
    send('status', { message: 'Baixando o runtime Python WebAssembly…' });
    pyodide = await loadPyodide({ indexURL: PYODIDE_BASE });
    pyodide.setStdout({ batched: (text) => send('stdout', { text }) });
    pyodide.setStderr({ batched: (text) => send('stderr', { text }) });
    const version = pyodide.runPython('import sys; sys.version.split()[0]');
    send('ready', { version, message: `Python ${version} pronto no navegador.` });
  } catch (error) {
    send('init-error', { message: error?.message || String(error) });
  }
}

self.addEventListener('message', async (event) => {
  const data = event.data || {};
  if (data.type === 'run') {
    if (!pyodide) {
      send('run-error', { message: 'O runtime Python ainda não foi inicializado.' });
      return;
    }
    const code = typeof data.code === 'string' ? data.code.slice(0, 20000) : '';
    if (!code.trim()) return;
    try {
      const result = await pyodide.runPythonAsync(code);
      if (result !== undefined && result !== null) {
        let printable = '';
        if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
          printable = String(result);
        } else if (typeof result.toString === 'function') {
          printable = result.toString();
        }
        if (printable && printable !== 'None') send('result', { text: printable });
        if (typeof result.destroy === 'function') result.destroy();
      }
      send('done');
    } catch (error) {
      send('run-error', { message: error?.message || String(error) });
      send('done');
    }
  }
});

initialize();
