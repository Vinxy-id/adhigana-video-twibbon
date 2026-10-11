import os
import sys
import re
import json
import uuid
import socket
import subprocess
import threading
import time
from pathlib import Path
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory, after_this_request
from PIL import Image, ImageOps

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 30 * 1024 * 1024  # 30MB max upload

BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"
TEMP_DIR = BASE_DIR / "temp"
TEMP_DIR.mkdir(exist_ok=True)
DIST_DIR = BASE_DIR / "dist"

import hmac
import shutil

# Concurrency & Rate Limiting
RENDER_SEMAPHORE = threading.Semaphore(2)  # Max 2 concurrent FFmpeg rendering jobs
IP_RENDER_TIMESTAMPS = {}
IP_LOCK = threading.Lock()
PIN_FAILED_ATTEMPTS = {}
PIN_LOCK = threading.Lock()

def load_config():
    if CONFIG_PATH.exists():
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "campaign_title": "ADHIGANA INFORMATIKA 2026",
        "campaign_subtitle": "Fakultas Sains dan Teknologi",
        "campaign_tagline": "Are You Ready? Better Things Ahead :)",
        "description": "Upload foto dan download Video Twibbon kamu secara instan tanpa ribet!",
        "caption_template": "[ARE YOU READY FOR ADHIGANA INFORMATIKA 2026?]\n\n#Adhigana2026 #Informatika",
        "template_video": "static/videos/template.mp4",
        "static_frame": "static/images/frame.png",
        "circle_center_x": 536,
        "circle_center_y": 543,
        "circle_radius": 330,
        "twibbonize_url": "https://www.twibbonize.com",
        "admin_pin": "adhigana2026"
    }

def save_config(cfg):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)

def get_safe_config():
    """Return config without exposing admin_pin to public"""
    cfg = load_config()
    safe_cfg = {k: v for k, v in cfg.items() if k != "admin_pin"}
    return safe_cfg

def get_admin_pin():
    env_pin = os.environ.get("ADMIN_PIN")
    if env_pin:
        return str(env_pin).strip()
    cfg = load_config()
    return str(cfg.get("admin_pin", "adhigana2026")).strip()

def verify_admin_pin(req):
    client_ip = get_client_ip()
    now = time.time()
    
    with PIN_LOCK:
        # Rate limit PIN attempts: max 5 failed attempts per 5 minutes per IP
        attempts = [t for t in PIN_FAILED_ATTEMPTS.get(client_ip, []) if (now - t) < 300]
        if len(attempts) >= 5:
            return False

    expected_pin = get_admin_pin()
    submitted = (
        req.headers.get("X-Admin-Pin") or
        req.args.get("pin") or
        (req.is_json and req.json and req.json.get("admin_pin")) or
        req.form.get("admin_pin") or
        ""
    )
    is_valid = hmac.compare_digest(str(submitted).strip(), expected_pin)

    with PIN_LOCK:
        if not is_valid:
            attempts.append(now)
            PIN_FAILED_ATTEMPTS[client_ip] = attempts
        else:
            PIN_FAILED_ATTEMPTS.pop(client_ip, None)

    return is_valid

def get_client_ip():
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "127.0.0.1"

def check_ip_rate_limit(ip):
    # Allow localhost without restrictive limits
    if ip in ("127.0.0.1", "localhost", "::1"):
        return True, ""
    now = time.time()
    with IP_LOCK:
        # Keep timestamps from the last 60 seconds
        history = [t for t in IP_RENDER_TIMESTAMPS.get(ip, []) if (now - t) < 60]
        # Cooldown check: 2 seconds between renders
        if history and (now - history[-1] < 2):
            return False, "Mohon tunggu 2 detik sebelum melakukan render lagi."
        # Quota check: max 12 render requests per minute per IP
        if len(history) >= 12:
            return False, "Batas antrean render tercapai (maks. 12 kali per menit). Silakan coba 1 menit lagi."
        history.append(now)
        IP_RENDER_TIMESTAMPS[ip] = history
        return True, ""

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def clean_old_temp_files():
    """Periodically remove temporary files older than 15 minutes"""
    while True:
        try:
            now = time.time()
            for p in TEMP_DIR.glob("*"):
                if p.is_file() and (now - p.stat().st_mtime > 900):
                    try:
                        p.unlink()
                    except Exception:
                        pass
        except Exception:
            pass
        time.sleep(300)

cleanup_thread = threading.Thread(target=clean_old_temp_files, daemon=True)
cleanup_thread.start()

@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

@app.route("/")
def index():
    if (DIST_DIR / "index.html").exists():
        return send_from_directory(DIST_DIR, "index.html")
    cfg = get_safe_config()
    local_ip = get_local_ip()
    port = int(os.environ.get("PORT", 5000))
    host = request.host
    if "localhost" in host or "127.0.0.1" in host:
        network_url = f"http://{local_ip}:{port}"
    else:
        scheme = request.headers.get("X-Forwarded-Proto", request.scheme)
        network_url = f"{scheme}://{host}"
    is_admin = bool(request.args.get("admin"))
    return render_template(
        "index.html",
        config=cfg,
        network_url=network_url,
        local_ip=local_ip,
        port=port,
        is_admin=is_admin
    )

@app.route("/assets/<path:filename>")
def serve_assets(filename):
    if (DIST_DIR / "assets").exists():
        return send_from_directory(DIST_DIR / "assets", filename)
    return "", 404

@app.route("/favicon.ico")
def favicon_ico():
    if (DIST_DIR / "favicon.ico").exists():
        return send_from_directory(DIST_DIR, "favicon.ico", mimetype="image/vnd.microsoft.icon")
    return send_from_directory(BASE_DIR / "static", "favicon.ico", mimetype="image/vnd.microsoft.icon")

@app.route("/favicon.svg")
def favicon_svg():
    if (DIST_DIR / "favicon.svg").exists():
        return send_from_directory(DIST_DIR, "favicon.svg", mimetype="image/svg+xml")
    return send_from_directory(BASE_DIR / "static", "favicon.svg", mimetype="image/svg+xml")

@app.route("/videos/<path:filename>")
def serve_videos(filename):
    if (DIST_DIR / "videos" / filename).exists():
        return send_from_directory(DIST_DIR / "videos", filename)
    if (BASE_DIR / "public" / "videos" / filename).exists():
        return send_from_directory(BASE_DIR / "public" / "videos", filename)
    return send_from_directory(BASE_DIR / "static" / "videos", filename)

@app.route("/images/<path:filename>")
def serve_images(filename):
    if (DIST_DIR / "images" / filename).exists():
        return send_from_directory(DIST_DIR / "images", filename)
    if (BASE_DIR / "public" / "images" / filename).exists():
        return send_from_directory(BASE_DIR / "public" / "images", filename)
    return send_from_directory(BASE_DIR / "static" / "images", filename)

@app.route("/audio/<path:filename>")
def serve_audio(filename):
    if (DIST_DIR / "audio" / filename).exists():
        return send_from_directory(DIST_DIR / "audio", filename)
    if (BASE_DIR / "public" / "audio" / filename).exists():
        return send_from_directory(BASE_DIR / "public" / "audio", filename)
    return send_from_directory(BASE_DIR / "static" / "audio", filename)

@app.route("/favicon.png")
def favicon_png():
    if (DIST_DIR / "favicon.png").exists():
        return send_from_directory(DIST_DIR, "favicon.png", mimetype="image/png")
    return send_from_directory(BASE_DIR / "static", "favicon.png", mimetype="image/png")

@app.route("/api/config", methods=["GET", "POST"])
def handle_config():
    if request.method == "POST":
        if not verify_admin_pin(request):
            return jsonify({
                "status": "error",
                "message": "Akses ditolak! PIN Admin salah atau tidak disertakan."
            }), 403

        data = request.json or {}
        cfg = load_config()

        # Whitelist allowed modification keys
        allowed_keys = [
            "campaign_title",
            "campaign_subtitle",
            "campaign_tagline",
            "description",
            "caption_template",
            "twibbonize_url",
            "circle_center_x",
            "circle_center_y",
            "circle_radius"
        ]
        for k in allowed_keys:
            if k in data:
                cfg[k] = data[k]

        # Optional change of PIN
        if data.get("new_admin_pin") and str(data.get("new_admin_pin")).strip():
            cfg["admin_pin"] = str(data["new_admin_pin"]).strip()

        save_config(cfg)
        return jsonify({"status": "success", "config": get_safe_config()})

    return jsonify(get_safe_config())

@app.route("/api/network-info")
def network_info():
    ip = get_local_ip()
    port = int(os.environ.get("PORT", 5000))
    host = request.host
    if "localhost" in host or "127.0.0.1" in host:
        url = f"http://{ip}:{port}"
    else:
        scheme = request.headers.get("X-Forwarded-Proto", request.scheme)
        url = f"{scheme}://{host}"
    return jsonify({
        "local_ip": ip,
        "port": port,
        "url": url,
        "localhost_url": f"http://localhost:{port}"
    })

@app.route("/api/render-video", methods=["POST", "HEAD"])
def render_video():
    if request.method == "HEAD":
        return "", 200

    client_ip = get_client_ip()

    # Rate limiting check
    allowed, rate_msg = check_ip_rate_limit(client_ip)
    if not allowed:
        return jsonify({"status": "error", "message": rate_msg}), 429

    # Concurrency check (Semaphore)
    acquired = RENDER_SEMAPHORE.acquire(blocking=False)
    if not acquired:
        return jsonify({
            "status": "error",
            "message": "Server sedang memproses render video mahasiswa lain. Harap tunggu 5–10 detik lalu coba lagi!"
        }), 429

    user_photo_path = None
    output_video_path = None

    try:
        cfg = load_config()
        template_video = BASE_DIR / "static/videos/template.mp4"
        if not template_video.exists():
            return jsonify({"status": "error", "message": "Template video tidak ditemukan di server"}), 404

        # Read uploaded composited photo
        if "photo" not in request.files and "photo_base64" not in request.form:
            return jsonify({"status": "error", "message": "Foto tidak ditemukan dalam request"}), 400

        job_id = str(uuid.uuid4())[:8]
        user_photo_path = TEMP_DIR / f"user_{job_id}.png"
        output_video_path = TEMP_DIR / f"twibbon_{job_id}.mp4"

        if "photo" in request.files:
            file = request.files["photo"]
            file.save(user_photo_path)
        else:
            import base64
            b64_data = request.form["photo_base64"]
            if "," in b64_data:
                b64_data = b64_data.split(",")[1]
            with open(user_photo_path, "wb") as f:
                f.write(base64.b64decode(b64_data))

        # SECURITY: Validate image using Pillow (prevent decompression bombs, corrupted/polyglot files)
        try:
            with Image.open(user_photo_path) as img:
                img.verify()
            with Image.open(user_photo_path) as img:
                img = ImageOps.exif_transpose(img)
                img = img.convert("RGBA")
                # Resize if unnecessarily large (prevent memory exhaustion in FFmpeg)
                if img.width > 3000 or img.height > 3000:
                    img.thumbnail((1500, 1500), Image.Resampling.LANCZOS)
                img.save(user_photo_path, "PNG")
        except Exception:
            if user_photo_path.exists():
                user_photo_path.unlink()
            return jsonify({"status": "error", "message": "File gambar tidak valid atau rusak."}), 400

        # Build FFmpeg command:
        # Photo is ONLY overlaid starting at 9.6s when the circular twibbon frame appears!
        filter_str = (
            "[0:v]scale=1080:1080,format=yuva420p[photo]; "
            "[1:v]split[vid_base][vid_keyed]; "
            "[vid_keyed]colorkey=0x000000:0.07:0.02[keyed]; "
            "[photo][keyed]overlay[composite_frame]; "
            "[vid_base][composite_frame]overlay=enable='gte(t,9.6)'[outv]"
        )

        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-i", str(user_photo_path),
            "-i", str(template_video),
            "-filter_complex", filter_str,
            "-map", "[outv]",
            "-map", "1:a?",  # copy audio if exists
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            str(output_video_path)
        ]

        print(f"[{job_id}] Rendering video with FFmpeg for IP {client_ip}...")
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=40)

        if res.returncode != 0:
            print(f"[{job_id}] FFmpeg error: {res.stderr}")
            return jsonify({"status": "error", "message": "Gagal memproses video dengan FFmpeg."}), 500

        @after_this_request
        def remove_files(response):
            def delayed_cleanup():
                time.sleep(10)
                try:
                    if user_photo_path and user_photo_path.exists():
                        user_photo_path.unlink()
                    if output_video_path and output_video_path.exists():
                        output_video_path.unlink()
                except Exception:
                    pass
            threading.Thread(target=delayed_cleanup, daemon=True).start()
            return response

        # Sanitize filename to prevent HTTP Header Injection
        raw_title = cfg.get('campaign_title', 'Adhigana')
        safe_title = re.sub(r'[^a-zA-Z0-9_-]', '_', raw_title)[:35]
        filename = f"Twibbon_{safe_title}_{job_id}.mp4"

        return send_file(
            output_video_path,
            mimetype="video/mp4",
            as_attachment=True,
            download_name=filename
        )

    except subprocess.TimeoutExpired:
        if user_photo_path and user_photo_path.exists():
            user_photo_path.unlink()
        if output_video_path and output_video_path.exists():
            output_video_path.unlink()
        return jsonify({"status": "error", "message": "Waktu pemrosesan video habis (timeout)."}), 504

    except Exception as e:
        import traceback
        traceback.print_exc()
        if user_photo_path and user_photo_path.exists():
            try:
                user_photo_path.unlink()
            except Exception:
                pass
        return jsonify({"status": "error", "message": str(e)}), 500

    finally:
        RENDER_SEMAPHORE.release()

@app.route("/api/upload-template", methods=["POST"])
def upload_template():
    if not verify_admin_pin(request):
        return jsonify({
            "status": "error",
            "message": "Akses ditolak! PIN Admin salah atau tidak disertakan."
        }), 403

    if "video" not in request.files:
        return jsonify({"status": "error", "message": "File video tidak ditemukan"}), 400
    video_file = request.files["video"]
    if not video_file.filename:
        return jsonify({"status": "error", "message": "Nama file kosong"}), 400

    # Validate extension
    ext = Path(video_file.filename).suffix.lower()
    if ext not in [".mp4", ".mov", ".mkv", ".webm"]:
        return jsonify({"status": "error", "message": "Format video harus berupa MP4 atau MOV"}), 400

    raw_path = TEMP_DIR / f"raw_template_{int(time.time())}{ext}"
    video_file.save(raw_path)

    # Convert to standard H.264 MP4 with AAC
    dest_path = BASE_DIR / "static/videos/template.mp4"
    cmd = [
        "ffmpeg", "-y",
        "-i", str(raw_path),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "19",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        str(dest_path)
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if raw_path.exists():
            raw_path.unlink()

        if res.returncode != 0:
            return jsonify({"status": "error", "message": f"Gagal memproses video: {res.stderr[-300:]}"}), 500

        # Synchronize template video to dist and public directories
        for other_video_dir in [DIST_DIR / "videos", BASE_DIR / "public/videos"]:
            if other_video_dir.exists():
                try:
                    shutil.copy2(dest_path, other_video_dir / "template.mp4")
                except Exception:
                    pass

        # Extract audio to theme.mp3 for all directories (static, dist, public)
        for audio_dir in [BASE_DIR / "static/audio", DIST_DIR / "audio", BASE_DIR / "public/audio"]:
            audio_dir.mkdir(parents=True, exist_ok=True)
            audio_dest = audio_dir / "theme.mp3"
            audio_cmd = ["ffmpeg", "-y", "-i", str(dest_path), "-vn", "-c:a", "libmp3lame", "-b:a", "192k", str(audio_dest)]
            try:
                subprocess.run(audio_cmd, capture_output=True, timeout=30)
            except Exception:
                pass

        return jsonify({"status": "success", "message": "Template video dan audio resmi berhasil diperbarui!"})
    except subprocess.TimeoutExpired:
        if raw_path.exists():
            raw_path.unlink()
        return jsonify({"status": "error", "message": "Proses konversi video template timeout"}), 504

if __name__ == "__main__":
    if sys.platform.startswith('win'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass
    ip = get_local_ip()
    port = int(os.environ.get("PORT", 5000))
    print("=" * 60)
    print("  [*] TWIBBONIZE VIDEO CREATOR - ADHIGANA INFORMATIKA 2026")
    print("=" * 60)
    print(f"  [+] Local PC URL    : http://localhost:{port}")
    print(f"  [+] Network (HP/Wi-Fi): http://{ip}:{port}")
    print(f"  [+] Admin Mode URL  : http://localhost:{port}/?admin=true")
    print("=" * 60)
    print("  Buka browser atau bagikan link Network ke teman di Wi-Fi yang sama.")
    print("=" * 60)
    app.run(host="0.0.0.0", port=port, debug=False)
