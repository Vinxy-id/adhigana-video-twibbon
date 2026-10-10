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

### Cara 1: Menggunakan File Batch (Paling Mudah)
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

Karena backend menggunakan **FFmpeg** untuk penggabungan video 1080p, disarankan menggunakan platform yang mendukung Docker:

### Opsi 1: Render.com (Mudah & Gratis)
1. Buat akun di [render.com](https://render.com) dan hubungkan akun GitHub Anda.
2. Klik **New +** > **Web Service**.
3. Pilih repository ini (`adhigana-video-twibbon`).
4. Pada pilihan **Environment**, pilih **Docker** (Render otomatis mendeteksi `Dockerfile` dan menginstall FFmpeg).
5. Pada bagian **Instance Type**, pilih **Free**.
6. Klik **Create Web Service**. Tunggu proses build selesai dan URL publik Anda siap digunakan!

### Opsi 2: Railway.app
1. Buka [railway.app](https://railway.app) dan login dengan GitHub.
2. Klik **New Project** > **Deploy from GitHub repo**.
3. Pilih repository ini. Railway otomatis mendeteksi `Dockerfile` dan langsung menjalankan server.

### Opsi 3: Hugging Face Spaces (Gratis & Kuat)
1. Buka [huggingface.co/spaces](https://huggingface.co/spaces).
2. Buat Space baru, pilih SDK: **Docker**.
3. Hubungkan atau push repositori ini ke Space Anda. Mendapatkan spesifikasi 2 vCPU + 16 GB RAM gratis.

