@echo off
cd /d "%~dp0"
node scripts\traffic-report.js
if errorlevel 1 (
  pause
  exit /b 1
)
start "" "reports\traffic-report.html"
