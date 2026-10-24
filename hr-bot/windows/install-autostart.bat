@echo off
rem Botni yashirin rejimda ishga tushiradi va Windows yoqilganda avtomatik ishga tushadigan qiladi.
chcp 65001 >nul
call "%~dp0stop-bot.bat" silent
set "BAT=%~dp0start-bot.bat"
set "VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\hr-bot.vbs"
> "%VBS%" echo CreateObject("WScript.Shell").Run """%BAT%""", 0, False
wscript "%VBS%"
echo.
echo  Bot fonda ishga tushdi.
echo  Kompyuter yoqilganda ham o'zi avtomatik ishga tushadi.
echo  Log fayl: hr-bot\data\bot.log
echo.
pause
