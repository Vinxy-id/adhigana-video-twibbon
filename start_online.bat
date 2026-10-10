@echo off
chcp 65001 >nul
title Video Twibbon Online - Cloudflare Tunnel
cd /d "%~dp0"

echo ======================================================================
echo       🎬 VIDEO TWIBBON ONLINE CREATOR - ADHIGANA INFORMATIKA 2026
echo ======================================================================
echo.
echo  [1/2] Menyalakan server lokal di background...
start /b python app.py

echo.
echo  [2/2] Menghubungkan ke Internet publik via Cloudflare Tunnel...
echo.
echo  ----------------------------------------------------------------------
echo  Tunggu beberapa detik, Cloudflare akan menampilkan link publik:
echo  (Cari baris: https://xxxx.trycloudflare.com)
echo  Salin link tersebut dan sebarkan ke grup WhatsApp / peserta!
echo  ----------------------------------------------------------------------
echo.

cloudflared tunnel --url http://localhost:5000

pause
