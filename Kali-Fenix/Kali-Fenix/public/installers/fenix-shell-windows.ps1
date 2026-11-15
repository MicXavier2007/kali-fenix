$ErrorActionPreference = 'Stop'

Write-Host 'Kali Fenix Shell - instalador local Windows' -ForegroundColor Cyan
Write-Host 'O ttyd será executado com as permissões da sua conta atual.'

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw 'WinGet não foi encontrado. Atualize o App Installer pela Microsoft Store ou instale o ttyd manualmente pelo repositório oficial.'
}

winget install --id tsl0922.ttyd --exact --source winget

Write-Host ''
Write-Host 'Instalação concluída. Feche e reabra o PowerShell e execute:' -ForegroundColor Green
Write-Host 'ttyd.exe --interface 127.0.0.1 --port 7681 --writable powershell.exe' -ForegroundColor Yellow
Write-Host 'Depois abra http://127.0.0.1:7681 neste computador.'
Write-Host 'Não exponha a porta 7681 diretamente à internet.'
