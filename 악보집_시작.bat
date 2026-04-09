@echo off
cd /d "C:\Users\UserPC\Desktop\안티그래비티\악보생성"
start /B npm run dev
timeout /t 2 /nobreak >nul
start "" "http://localhost:5173"
