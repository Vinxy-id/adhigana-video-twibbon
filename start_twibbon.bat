@echo off
chcp 65001 >nul
title Video Twibbon Creator - Adhigana Informatika 2026
cd /d "%~dp0"

echo ======================================================================
echo       🎬 VIDEO TWIBBON CREATOR - ADHIGANA INFORMATIKA 2026
echo ======================================================================
echo.
echo  [1/2] Sedang menyalakan server lokal...
echo.

:: Buka browser setelah 2 detik
start /b "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:5000"

:: Jalankan python app.py
python app.py

pause
