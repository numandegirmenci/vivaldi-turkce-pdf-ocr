@echo off
cd /d "%~dp0\.."
node --test tests\text-utils.test.mjs tests\background.test.mjs
pause
