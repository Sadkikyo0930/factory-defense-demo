@echo off
powershell.exe -NoProfile -STA -File "%~dp0Extract-DailyWip.ps1"
if errorlevel 1 echo Extraction stopped. If company policy blocks scripts, request IT approval. This launcher does not bypass policy.
pause
