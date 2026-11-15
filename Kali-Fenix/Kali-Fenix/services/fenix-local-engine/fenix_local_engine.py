#!/usr/bin/env python3
"""Kali Fenix Local Engine - local-only, allowlisted command bridge.

This service intentionally does NOT expose an unrestricted system shell.
It binds to loopback, requires a per-user bearer token, validates the web
Origin, limits request size/time, and confines filesystem commands to one
workspace directory.
"""
from __future__ import annotations

import argparse
import datetime as dt
import getpass
import hmac
import json
import os
import platform
import secrets
import shlex
import shutil
import socket
import subprocess
import sys
import threading
import time
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

HOST = "127.0.0.1"
DEFAULT_PORT = 8765
MAX_BODY = 4096
MAX_OUTPUT = 16000
MAX_FILE_READ = 64 * 1024
MAX_FILE_WRITE = 8 * 1024

DEFAULT_ORIGINS = {
    "https://kalifenix.netlify.app",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:8888",
    "http://127.0.0.1:8888",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
}


def config_dir() -> Path:
    if os.name == "nt":
        root = Path(os.environ.get("APPDATA", Path.home()))
        return root / "KaliFenix"
    return Path.home() / ".config" / "kali-fenix"


def load_or_create_token(reset: bool = False) -> str:
    folder = config_dir()
    folder.mkdir(parents=True, exist_ok=True)
    try:
        folder.chmod(0o700)
    except OSError:
        pass
    token_file = folder / "engine.token"
    if reset and token_file.exists():
        token_file.unlink()
    if token_file.exists():
        token = token_file.read_text(encoding="utf-8").strip()
        if len(token) >= 40:
            return token
    token = secrets.token_urlsafe(36)
    token_file.write_text(token + "\n", encoding="utf-8")
    try:
        token_file.chmod(0o600)
    except OSError:
        pass
    return token


def allowed_origins() -> set[str]:
    origins = set(DEFAULT_ORIGINS)
    extra = os.environ.get("FENIX_ALLOWED_ORIGINS", "")
    origins.update(item.strip() for item in extra.split(",") if item.strip())
    return origins


def clean_output(value: Any) -> str:
    text = str(value)
    if len(text) > MAX_OUTPUT:
        text = text[:MAX_OUTPUT] + "\n[saída truncada pelo Fenix Local Engine]"
    return text


class FenixServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address: tuple[str, int], token: str, origins: set[str], workspace: Path):
        super().__init__(address, FenixHandler)
        self.token = token
        self.origins = origins
        self.workspace = workspace.resolve()
        self.cwd = self.workspace
        self.cwd_lock = threading.RLock()
        self.rate_lock = threading.Lock()
        self.requests: dict[str, deque[float]] = defaultdict(deque)


class FenixHandler(BaseHTTPRequestHandler):
    server: FenixServer
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args: Any) -> None:
        # Keep the local console readable; no command contents are logged.
        sys.stdout.write("[Fenix Engine] " + (fmt % args) + "\n")

    def _origin(self) -> str:
        return self.headers.get("Origin", "")

    def _cors_allowed(self) -> bool:
        origin = self._origin()
        if not origin or origin not in self.server.origins:
            return False
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Max-Age", "300")
        return True

    def _headers(self) -> None:
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'none'")

    def _json(self, status: int, payload: dict[str, Any], cors: bool = True) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._headers()
        if cors:
            self._cors_allowed()
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self) -> None:
        if self._origin() not in self.server.origins:
            self._json(403, {"error": "Origem não autorizada."}, cors=False)
            return
        self.send_response(204)
        self._headers()
        self._cors_allowed()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _authorized(self) -> bool:
        # Require a browser Origin and a bearer token for every API route.
        origin = self._origin()
        if origin not in self.server.origins:
            self._json(403, {"error": "Origem não autorizada. Abra o Kali Fenix pelo domínio oficial."}, cors=False)
            return False
        supplied = self.headers.get("Authorization", "")
        prefix = "Bearer "
        candidate = supplied[len(prefix):].strip() if supplied.startswith(prefix) else ""
        if not candidate or not hmac.compare_digest(candidate, self.server.token):
            self._json(401, {"error": "Token inválido. Confira o token exibido no terminal local."})
            return False
        client = self.client_address[0]
        now = time.monotonic()
        with self.server.rate_lock:
            bucket = self.server.requests[client]
            while bucket and now - bucket[0] > 10:
                bucket.popleft()
            if len(bucket) >= 25:
                self._json(429, {"error": "Muitas solicitações. Aguarde alguns segundos."})
                return False
            bucket.append(now)
        return True

    def do_GET(self) -> None:
        if self.path != "/api/status":
            self._json(404, {"error": "Rota não encontrada."}, cors=False)
            return
        if not self._authorized():
            return
        with self.server.cwd_lock:
            cwd = str(self.server.cwd)
        self._json(200, {
            "ok": True,
            "name": "Fenix Local Engine",
            "version": "1.0.0",
            "platform": platform.platform(),
            "python": platform.python_version(),
            "workspace": str(self.server.workspace),
            "cwd": cwd,
            "capabilities": ["pwd", "ls", "cd", "whoami", "hostname", "date", "uname", "df", "mkdir", "touch", "cat", "python --version", "git --version"],
            "security": "loopback-only; bearer-token; origin allowlist; workspace confinement; no unrestricted shell"
        })

    def do_POST(self) -> None:
        if self.path != "/api/command":
            self._json(404, {"error": "Rota não encontrada."}, cors=False)
            return
        if not self._authorized():
            return
        content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        if content_type != "application/json":
            self._json(415, {"error": "Envie application/json."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            self.close_connection = True
            self._json(413, {"error": "Comando vazio ou solicitação acima do limite de 4 KB."})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._json(400, {"error": "JSON inválido."})
            return
        command = payload.get("command") if isinstance(payload, dict) else None
        if not isinstance(command, str) or not command.strip() or len(command) > 1000:
            self._json(400, {"error": "Informe um comando de até 1000 caracteres."})
            return
        try:
            result = self._run_command(command.strip())
            self._json(200, {"ok": True, "output": clean_output(result)})
        except ValueError as exc:
            self._json(400, {"ok": False, "error": str(exc)})
        except Exception:
            self._json(500, {"ok": False, "error": "Falha interna ao processar o comando."})

    def _safe_path(self, raw: str) -> Path:
        if not raw or "\x00" in raw:
            raise ValueError("Caminho inválido.")
        with self.server.cwd_lock:
            cwd = self.server.cwd
        candidate = Path(raw).expanduser()
        if not candidate.is_absolute():
            candidate = cwd / candidate
        resolved = candidate.resolve(strict=False)
        root = self.server.workspace
        if resolved != root and root not in resolved.parents:
            raise ValueError("Acesso negado: os arquivos ficam restritos à pasta KaliFenixWorkspace.")
        return resolved

    def _run_program(self, argv: list[str]) -> str:
        try:
            completed = subprocess.run(
                argv, cwd=str(self.server.workspace), shell=False,
                stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, errors="replace", timeout=4, check=False,
                env=os.environ.copy()
            )
            return completed.stdout.strip() or f"Processo finalizado com código {completed.returncode}."
        except FileNotFoundError:
            return f"Programa não encontrado: {argv[0]}"
        except subprocess.TimeoutExpired:
            return "Tempo limite excedido (4 segundos)."

    def _run_command(self, command: str) -> str:
        # No shell metacharacters, chaining, redirection, substitutions or newlines.
        forbidden = ["\n", "\r", ";", "&&", "||", "|", ">", "<", "`", "$("]
        if any(mark in command for mark in forbidden):
            raise ValueError("Comandos encadeados, redirecionamentos e substituições não são permitidos.")
        try:
            args = shlex.split(command, posix=(os.name != "nt"))
            if os.name == "nt":
                args = [item[1:-1] if len(item) >= 2 and item[0] == item[-1] and item[0] in {"\"", "\'"} else item for item in args]
        except ValueError:
            raise ValueError("Aspas ou argumentos inválidos.")
        if not args:
            return ""
        cmd, rest = args[0].lower(), args[1:]

        if cmd in {"help", "ajuda"}:
            return (
                "Comandos disponíveis:\n"
                "  help                  mostra esta ajuda\n"
                "  pwd                   mostra a pasta atual\n"
                "  ls [caminho]          lista arquivos do workspace\n"
                "  cd [pasta]            muda de pasta dentro do workspace\n"
                "  whoami                usuário atual\n"
                "  hostname              nome do computador\n"
                "  date                  data e hora local\n"
                "  uname                 informações do sistema\n"
                "  df                    espaço do disco do workspace\n"
                "  mkdir NOME            cria uma pasta no workspace\n"
                "  touch ARQUIVO         cria um arquivo vazio\n"
                "  cat ARQUIVO           lê um arquivo de texto do workspace\n"
                "  python --version      versão do Python instalado\n"
                "  git --version         versão do Git instalado\n"
                "  clear                 limpa a tela do terminal\n\n"
                "Este motor não oferece shell irrestrito, sudo, APT, varredura de rede ou acesso fora do workspace."
            )
        if cmd == "clear":
            return "__FENIX_CLEAR__"
        if cmd == "exit":
            return "O motor continua em execução. Para encerrá-lo, pressione Ctrl+C no terminal local."
        if cmd == "pwd":
            if rest:
                raise ValueError("Uso: pwd")
            with self.server.cwd_lock:
                return str(self.server.cwd)
        if cmd == "whoami":
            if rest:
                raise ValueError("Uso: whoami")
            return getpass.getuser()
        if cmd == "hostname":
            if rest:
                raise ValueError("Uso: hostname")
            return socket.gethostname()
        if cmd == "date":
            if rest:
                raise ValueError("Uso: date")
            return dt.datetime.now().astimezone().isoformat(timespec="seconds")
        if cmd == "uname":
            if rest:
                raise ValueError("Uso: uname")
            return platform.platform()
        if cmd == "df":
            if rest:
                raise ValueError("Uso: df")
            usage = shutil.disk_usage(self.server.workspace)
            gib = 1024 ** 3
            return f"Workspace em {self.server.workspace}\nTotal: {usage.total / gib:.2f} GiB\nUsado: {usage.used / gib:.2f} GiB\nLivre: {usage.free / gib:.2f} GiB"
        if cmd == "ls":
            if len(rest) > 1:
                raise ValueError("Uso: ls [caminho]")
            path = self._safe_path(rest[0] if rest else ".")
            if not path.is_dir():
                raise ValueError("O caminho informado não é uma pasta.")
            entries = sorted(path.iterdir(), key=lambda item: (not item.is_dir(), item.name.lower()))[:100]
            if not entries:
                return "(pasta vazia)"
            return "\n".join((item.name + ("/" if item.is_dir() else "")) for item in entries)
        if cmd == "cd":
            if len(rest) > 1:
                raise ValueError("Uso: cd [pasta]")
            target = self._safe_path(rest[0] if rest else ".")
            if not target.is_dir():
                raise ValueError("Pasta não encontrada.")
            with self.server.cwd_lock:
                self.server.cwd = target
            return str(target)
        if cmd == "mkdir":
            if len(rest) != 1:
                raise ValueError("Uso: mkdir NOME")
            target = self._safe_path(rest[0])
            try:
                target.mkdir(parents=True, exist_ok=True)
            except OSError as exc:
                raise ValueError(f"Não foi possível criar a pasta: {exc}")
            return f"Pasta criada: {target.name}"
        if cmd == "touch":
            if len(rest) != 1:
                raise ValueError("Uso: touch ARQUIVO")
            target = self._safe_path(rest[0])
            if target.exists() and target.is_dir():
                raise ValueError("O caminho informado é uma pasta.")
            try:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.touch(exist_ok=True)
            except OSError as exc:
                raise ValueError(f"Não foi possível criar o arquivo: {exc}")
            return f"Arquivo pronto: {target.name}"
        if cmd == "cat":
            if len(rest) != 1:
                raise ValueError("Uso: cat ARQUIVO")
            target = self._safe_path(rest[0])
            if not target.is_file():
                raise ValueError("Arquivo não encontrado.")
            if target.stat().st_size > MAX_FILE_READ:
                raise ValueError("Arquivo maior que 64 KB. Leitura bloqueada.")
            try:
                return target.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                raise ValueError("O arquivo não é texto UTF-8.")
        if cmd == "python":
            if rest != ["--version"]:
                raise ValueError("Por segurança, o motor aceita somente: python --version. Use a instalação local do Python para executar seus próprios scripts.")
            return self._run_program([sys.executable, "--version"])
        if cmd == "git":
            if rest != ["--version"]:
                raise ValueError("Por segurança, o motor aceita somente: git --version.")
            git = shutil.which("git")
            return self._run_program([git, "--version"]) if git else "Git não encontrado neste computador."
        if cmd == "ip":
            if rest not in (["addr"], ["route"]):
                raise ValueError("Uso permitido: ip addr ou ip route (Linux).")
            ip_bin = shutil.which("ip")
            if not ip_bin:
                return "O comando ip não está disponível neste sistema."
            sub = ["-brief", "address"] if rest == ["addr"] else ["route"]
            return self._run_program([ip_bin, *sub])

        raise ValueError(f"Comando não autorizado: {cmd}. Digite help para ver a lista permitida.")


def main() -> int:
    if sys.version_info < (3, 10):
        print("O Fenix Local Engine exige Python 3.10 ou superior.", file=sys.stderr)
        return 1
    parser = argparse.ArgumentParser(description="Kali Fenix Local Engine (somente loopback)")
    parser.add_argument("--port", type=int, default=int(os.environ.get("FENIX_LOCAL_ENGINE_PORT", DEFAULT_PORT)))
    parser.add_argument("--reset-token", action="store_true", help="gera um novo token de acesso")
    args = parser.parse_args()
    if not (1024 <= args.port <= 65535):
        parser.error("A porta deve estar entre 1024 e 65535.")

    token = load_or_create_token(args.reset_token)
    workspace = Path.home() / "KaliFenixWorkspace"
    workspace.mkdir(parents=True, exist_ok=True)
    try:
        workspace.chmod(0o700)
    except OSError:
        pass

    try:
        server = FenixServer((HOST, args.port), token, allowed_origins(), workspace)
    except OSError as exc:
        print(f"Não foi possível iniciar o Fenix Local Engine: {exc}", file=sys.stderr)
        return 1

    print("\n============================================")
    print("        KALI FENIX — LOCAL ENGINE 1.0")
    print("============================================")
    print(f"Endereço local : http://{HOST}:{args.port}")
    print(f"Workspace      : {workspace}")
    print(f"Python         : {platform.python_version()}")
    print("\nTOKEN DE ACESSO (cole na página Fenix Shell):")
    print(token)
    print("\nOrigens autorizadas:")
    for origin in sorted(server.origins):
        print(f"  - {origin}")
    print("\nAtenção: apenas comandos permitidos e arquivos no workspace.")
    print("Não compartilhe o token. Para encerrar, pressione Ctrl+C.\n")
    try:
        server.serve_forever(poll_interval=0.4)
    except KeyboardInterrupt:
        print("\nEncerrando o Fenix Local Engine...")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
