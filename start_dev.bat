@echo off
chcp 65001 >nul
title Twibbon Creator (React + Python FFmpeg)
cd /d "%~dp0"

echo ======================================================================
echo    REACT + VITE + PYTHON FFMPEG BACKEND
echo ======================================================================
echo.
echo  [1/2] Menyalakan Python backend FFmpeg (port 5000)...
start /b "" python app.py

echo  [2/2] Menyalakan frontend React Vite (port 5173)...
echo.

start "" http://localhost:5173
npm run dev
