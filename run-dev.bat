@echo off
title Capacity Connect - Dev Server
cd /d "%~dp0"
echo Starting Capacity Connect dev server...
echo Keep this window OPEN. Close it to stop the server.
echo Then open http://localhost:3000 in your browser.
echo.
where npm >nul 2>&1
if %ERRORLEVEL% equ 0 (
  call npm run dev
) else (
  call "C:\Program Files\nodejs\npm.cmd" run dev
)
echo.
echo Server stopped. Press any key to close this window.
pause >nul
