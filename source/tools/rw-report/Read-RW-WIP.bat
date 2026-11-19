@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "READER=%~dp0Read-RW-WIP.vbs"
cd /d "%SystemRoot%"
"%SystemRoot%\System32\cscript.exe" //nologo "%READER%"
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" echo Reader stopped. If company policy blocked it, contact IT.
pause
exit /b %RC%
