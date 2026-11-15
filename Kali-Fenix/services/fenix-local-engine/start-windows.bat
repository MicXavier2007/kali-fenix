@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 fenix_local_engine.py
  goto :end
)
where python >nul 2>nul
if %errorlevel%==0 (
  python fenix_local_engine.py
  goto :end
)
echo Python 3 nao foi encontrado.
echo Instale Python 3.10 ou superior em https://www.python.org/downloads/windows/
pause
:end
endlocal
