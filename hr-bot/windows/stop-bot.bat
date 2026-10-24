@echo off
rem Fonda ishlayotgan botni to'xtatadi (avtomatik ishga tushish saqlanib qoladi).
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and ($_.CommandLine -like '*hr-bot*start-bot.bat*' -or $_.CommandLine -like '*hr-bot*dist*index.js*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
if "%1"=="silent" exit /b
echo Bot to'xtatildi.
pause
