@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js nao encontrado. Instale em https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules\vite\bin\vite.js (
  echo Instalando dependencias do Relicario pela primeira vez...
  call npm install
  if errorlevel 1 (
    echo Falha ao instalar as dependencias. Verifique sua conexao com a internet.
    pause
    exit /b 1
  )
)
echo.
echo Relicario iniciando. Abra no navegador o endereco indicado abaixo.
echo Para encerrar: Ctrl+C
call npm run dev
pause
