#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 não encontrado. Instale Python 3.10 ou superior pelo gerenciador oficial da sua distribuição."
  exit 1
fi
python3 fenix_local_engine.py
