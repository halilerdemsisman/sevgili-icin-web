@echo off
REM EXIT Garden sunucusu. Ilk kurulumda once yonetici sifresini belirleyin:
REM   node sunucu.js --yonetici-sifre "GucluSifre"
REM Ayrinti: KURULUM.md
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js bulunamadi. https://nodejs.org adresinden LTS surumunu kurun. & pause & exit /b)
node --disable-warning=ExperimentalWarning sunucu.js
pause
