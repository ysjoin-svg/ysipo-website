@echo off
cd /d "C:\Users\Johnny\Desktop\Agent\永旭網站\scripts"
set PATH=C:\Users\Johnny\AppData\Local\node-v22.15.0-win-x64;C:\Program Files\Git\cmd;%PATH%
node generate-article.js >> "C:\Users\Johnny\Desktop\Agent\永旭網站\scripts\generate-article.log" 2>&1
