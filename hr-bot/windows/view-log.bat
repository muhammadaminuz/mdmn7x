@echo off
rem Bot logini jonli ko'rsatadi (yopish uchun oynani yoping).
chcp 65001 >nul
powershell -NoProfile -Command "Get-Content -Path '%~dp0..\data\bot.log' -Tail 50 -Wait -Encoding UTF8"
