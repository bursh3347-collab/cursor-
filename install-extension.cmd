@echo off
setlocal
cd /d %~dp0vscode-extension
if not exist node_modules npm install
npm run compile
npm run package
for %%f in (*.vsix) do set VSIX=%%f
if "%VSIX%"=="" (
  echo No VSIX package generated.
  exit /b 1
)
set CURSOR_EXE=%LocalAppData%\Programs\cursor\Cursor.exe
if exist "%CURSOR_EXE%" (
  "%CURSOR_EXE%" --install-extension "%CD%\%VSIX%"
  echo Installed %VSIX% into Cursor.
) else (
  echo Cursor.exe not found at %CURSOR_EXE%.
  echo Install manually: Cursor Extensions - Install from VSIX - %CD%\%VSIX%
)
