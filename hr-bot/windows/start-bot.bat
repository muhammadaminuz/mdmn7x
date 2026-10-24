@echo off
rem Botni ishga tushiradi va to'xtab qolsa avtomatik qayta ishga tushiradi.
chcp 65001 >nul
cd /d "%~dp0.."
if not exist data mkdir data
if not exist dist\index.js call npm run build
:loop
echo [%date% %time%] Bot ishga tushmoqda >> data\bot.log
node "%CD%\dist\index.js" >> data\bot.log 2>&1
echo [%date% %time%] Bot to'xtadi, 10 soniyadan keyin qayta ishga tushadi >> data\bot.log
ping -n 11 127.0.0.1 >nul
goto loop
