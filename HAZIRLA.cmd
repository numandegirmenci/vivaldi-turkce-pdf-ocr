@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where node.exe >nul 2>&1
if errorlevel 1 (
  if exist "%USERPROFILE%\Desktop\1\node.exe" set "PATH=%USERPROFILE%\Desktop\1;%PATH%"
)
where node.exe >nul 2>&1
if errorlevel 1 (
  echo HATA: Node.js bulunamadi. Node.js ZIP klasorunu Desktop\1 konumunda tutun.
  pause
  exit /b 1
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo HATA: npm.cmd bulunamadi.
  pause
  exit /b 1
)
echo 1/2 - Gerekli kutuphaneler indiriliyor...
call npm.cmd install --no-audit --no-fund --ignore-scripts
if errorlevel 1 goto :fail
echo 2/2 - Yerel Turkce OCR paketi hazirlaniyor...
node build.mjs
if errorlevel 1 goto :fail
echo.
echo BASARILI. Vivaldi'ye Eklenti klasorunu yukleyin.
pause
exit /b 0
:fail
echo.
echo KURULUM TAMAMLANAMADI. Yukaridaki hata mesajini paylasin.
pause
exit /b 1
