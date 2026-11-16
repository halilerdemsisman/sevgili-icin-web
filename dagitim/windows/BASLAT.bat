@echo off
REM EXIT Garden deneme paketi: sunucuyu bu bilgisayarda calistirir. Ayrinti: BENIOKU.txt
chcp 65001 >nul
title EXIT Garden sunucusu
cd /d "%~dp0"
set "NODE=%~dp0node\node.exe"
if not exist "%NODE%" (
  where node >nul 2>nul || (echo Node.js bulunamadi. Zip dosyasini butunuyle acin. & pause & exit /b 1)
  set "NODE=node"
)
"%NODE%" "%~dp0baslat.js"
pause
