---
title: Adhigana Video Twibbon 2026
emoji: 🎬
colorFrom: red
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# 🎬 Video Twibbon Creator - Adhigana Informatika 2026
Aplikasi web pembuat Video Twibbon interaktif mirip cara kerja **Twibbonize**. Memungkinkan peserta/mahasiswa memasang foto mereka ke dalam video twibbon secara otomatis **tanpa perlu aplikasi edit video (CapCut/Premiere) dan tanpa perlu setting chroma key manual**.

---

## ✨ Fitur Utama
1. **Otomatis Chroma Key & Masking**:
   - Foto otomatis masuk dan pas di dalam lingkaran twibbon (frame utama).
   - Opsi sinematik: foto juga bisa tampil di layar laptop intro (detik 0–3) saat karakter animasi sedang belajar!
2. **Editor Interaktif Responsif (Laptop & Smartphone)**:
   - **Geser (Pan)**: Geser foto dengan mouse atau sentuhan jari.
   - **Zoom**: Cubit layar (pinch-to-zoom), scroll mouse, atau pakai slider.
   - **Rotasi**: Putar foto dengan slider atau tombol `+90°`.
   - **Pusatkan & Pas Bingkai**: Satu klik untuk menyesuaikan foto ke tengah lingkaran.
3. **Pemutar Video & Preview Real-Time**:
   - Preview animasi secara langsung dengan tombol Play/Pause dan timeline slider.
   - Tombol loncat cepat ke detik penting: `11s (Frame Twibbon)`, `1.5s (Intro Laptop)`, `7s (Judul)`.
4. **Export Berkualitas Tinggi**:
   - **Download Video (.MP4)**: Full HD 1080x1080 @ 30 FPS lengkap dengan musik/audio asli (AAC).
   - **Download Foto (.PNG)**: Twibbon foto statis resolusi tinggi untuk foto profil WA/Instagram.
   - **Salin Caption**: Satu klik untuk menyalin teks format postingan Instagram/TikTok.
5. **Akses Smartphone via QR Code**:
   - Ada fitur QR Code bawaan. Teman/peserta yang terhubung ke Wi-Fi yang sama cukup scan barcode untuk langsung membuka web ini di HP mereka!

---

## 🚀 Cara Menjalankan

### Cara 1: Menjalankan Versi Modern React + Vite (Paling Direkomendasikan)
Cukup **klik 2x** file:
```
start_dev.bat
```
Atau jalankan di terminal:
```bash
npm run dev
```
Aplikasi akan otomatis menyala di `http://localhost:5173` dengan hot-reload kilat.

### Cara 2: Menggunakan File Batch Python (Flask)
Cukup **klik 2x** file:
```
start_twibbon.bat
```
Server akan otomatis menyala dan browser Anda akan langsung terbuka di alamat `http://localhost:5000`.

### Cara 2: Melalui Terminal / PowerShell
Buka folder ini di PowerShell/Terminal, lalu jalankan:
```bash
python app.py
```
Akses di browser:
- Di Laptop/PC sendiri: `http://localhost:5000`
- Di Smartphone (Wi-Fi/Hotspot sama): `http://[IP-Komputer-Anda]:5000` (misal `http://192.168.30.82:5000`)

---

## 🌐 Cara Membagikan Link ke Teman / Peserta

### A. Dalam Jaringan Wi-Fi / Hotspot yang Sama (Gratis & Cepat)
1. Nyalakan laptop dan pastikan laptop serta HP teman terhubung ke Wi-Fi / Hotspot yang sama.
2. Klik tombol **"Buka di HP"** di pojok kanan atas aplikasi.
3. Minta teman scan **QR Code** yang muncul menggunakan kamera HP mereka, atau bagikan link yang tertera (contoh: `http://192.168.30.82:5000`).

### B. Mengirim Link Online ke Seluruh Internet (Tanpa Batasan Wi-Fi)
Jika Anda ingin peserta dari rumah masing-masing bisa membuka link ini, Anda bisa menggunakan Cloudflare Tunnel atau Localtunnel gratis:
```bash
# Opsi 1: Menggunakan Localtunnel (tidak perlu install akun)
npx localtunnel --port 5000

# Opsi 2: Menggunakan Cloudflared
cloudflared tunnel --url http://localhost:5000
```
Tautan publik `https://...` akan otomatis terbuat dan bisa Anda sebarkan ke grup WhatsApp angkatan/peserta!

---

## 📁 Struktur Direktori
- `app.py`: Server Flask backend yang menangani routing & render FFmpeg.
- `config.json`: Konfigurasi nama kegiatan, deskripsi, caption bawaan, dan parameter bingkai.
- `Dockerfile`: Konfigurasi container Docker lengkap dengan Python 3.12 dan FFmpeg.
- `Procfile`: Konfigurasi WSGI Gunicorn untuk cloud platform.
- `requirements.txt`: Dependensi Python (Flask & Gunicorn).
- `start_twibbon.bat`: File peluncur cepat untuk Windows lokal.
- `templates/index.html`: Antarmuka web modern dengan Tailwind CSS & FontAwesome.
- `static/css/style.css`: Gaya tema gelap futuristik & kontrol slider.
- `static/js/app.js`: Logika interaktif canvas, gestures, WebGL compositor, dan export.
- `static/videos/template.mp4`: Video template twibbon (H.264 + AAC).
- `static/images/frame.png`: Bingkai transparan PNG resolusi tinggi.
- `static/images/mask.png`: Masker lingkaran halus antialiasing.

---

## ☁️ Panduan Deploy ke Cloud (Online 24/7)

### Opsi 1: Vercel / Cloudflare Pages (100% Client-Side, 0 Biaya, Anti-Down) ⭐ REKOMENDASI UTAMA UNTUK OSPEK
Karena aplikasi React ini mendukung pemrosesan 100% di browser (Canvas & MediaRecorder):
1. Push repositori ini ke GitHub.
2. Buka [vercel.com](https://vercel.com) atau [pages.cloudflare.com](https://pages.cloudflare.com).
3. Import repository GitHub ini.
4. Framework Preset akan otomatis terdeteksi sebagai **Vite**.
5. Klik **Deploy**! Web langsung aktif dengan link gratis HTTPS (contoh: `twibbon-ospek.vercel.app`) dan kuat menampung ribuan maba serentak tanpa takut server down!

### Opsi 2: Hugging Face Spaces (Gratis dengan Dukungan FFmpeg Server)
1. Buka [huggingface.co/spaces](https://huggingface.co/spaces).
2. Buat Space baru, pilih SDK: **Docker**.
3. Push repositori ini ke Space Anda. Mendapatkan spesifikasi 2 vCPU + 16 GB RAM gratis untuk menjalankan `Dockerfile` + FFmpeg.

### Opsi 3: Render.com / Railway
1. Buat akun di [render.com](https://render.com) atau [railway.app](https://railway.app).
2. Pilih Docker environment untuk menjalankan backend Flask.

