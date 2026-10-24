@echo off
rem Botni to'xtatadi va avtomatik ishga tushishni o'chiradi.
call "%~dp0stop-bot.bat" silent
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\hr-bot.vbs" 2>nul
echo Bot to'xtatildi va avtomatik ishga tushish o'chirildi.
pause
