@echo off
chcp 65001 >nul
title Twibbon Creator (React + Vite)
cd /d "%~dp0"

echo ======================================================================
echo    ⚛️ REACT + VITE TWIBBON CREATOR - ADHIGANA INFORMATIKA 2026
echo ======================================================================
echo.
echo  Menyalakan server lokal React + Vite...
echo.

start "" http://localhost:5173
npm run dev
