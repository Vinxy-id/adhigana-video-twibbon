import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import ysFixWebmDuration from 'fix-webm-duration';
import { RefreshCw } from 'lucide-react';
import Navbar from './components/Navbar';
import TwibbonCanvas from './components/TwibbonCanvas';
import ControlPanel from './components/ControlPanel';
import ShareModal from './components/ShareModal';
import GuideModal from './components/GuideModal';
import CameraModal from './components/CameraModal';
import RenderModal from './components/RenderModal';
import Toast from './components/Toast';
import defaultConfig from './config.json';

const resolveAssetUrl = (url, fallback = '') => {
  const target = url || fallback;
  if (!target) return '';
  if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('data:') || target.startsWith('blob:')) {
    return target;
  }
  const clean = target.replace(/^\.?\//, '');
  const base = import.meta.env.BASE_URL || './';
  return base.endsWith('/') ? base + clean : base + '/' + clean;
};

// Patch fragmented MP4 header (mvhd, tkhd, mehd) agar Galeri HP (Apple Photos & Android) membaca durasi (18 detik)
const fixMp4Duration = async (blob, durationSeconds) => {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const view = new DataView(arrayBuffer);
    let mvhdTimescale = 1000;

    const readBox = (start, end) => {
      let p = start;
      while (p + 8 <= end) {
        let size = view.getUint32(p);
        const type = String.fromCharCode(
          view.getUint8(p + 4),
          view.getUint8(p + 5),
          view.getUint8(p + 6),
          view.getUint8(p + 7)
        );

        if (size === 1 && p + 16 <= end) {
          size = Number(view.getBigUint64(p + 8));
        } else if (size === 0) {
          size = end - p;
        }
        if (size < 8 || p + size > end) break;

        const contentStart = p + 8;
        const contentEnd = p + size;

        if (type === 'moov' || type === 'trak' || type === 'mvex') {
          readBox(contentStart, contentEnd);
        } else if (type === 'mvhd') {
          const version = view.getUint8(contentStart);
          if (version === 0 && contentStart + 20 <= contentEnd) {
            mvhdTimescale = view.getUint32(contentStart + 12);
            const dur = Math.round(durationSeconds * mvhdTimescale);
            view.setUint32(contentStart + 16, dur);
          } else if (version === 1 && contentStart + 32 <= contentEnd) {
            mvhdTimescale = view.getUint32(contentStart + 20);
            const dur = BigInt(Math.round(durationSeconds * mvhdTimescale));
            view.setBigUint64(contentStart + 24, dur);
          }
        } else if (type === 'tkhd') {
          const version = view.getUint8(contentStart);
          if (version === 0 && contentStart + 24 <= contentEnd) {
            const dur = Math.round(durationSeconds * mvhdTimescale);
            view.setUint32(contentStart + 20, dur);
          } else if (version === 1 && contentStart + 36 <= contentEnd) {
            const dur = BigInt(Math.round(durationSeconds * mvhdTimescale));
            view.setBigUint64(contentStart + 28, dur);
          }
        } else if (type === 'mehd') {
          const version = view.getUint8(contentStart);
          if (version === 0 && contentStart + 8 <= contentEnd) {
            const dur = Math.round(durationSeconds * mvhdTimescale);
            view.setUint32(contentStart + 4, dur);
          } else if (version === 1 && contentStart + 12 <= contentEnd) {
            const dur = BigInt(Math.round(durationSeconds * mvhdTimescale));
            view.setBigUint64(contentStart + 4, dur);
          }
        }

        p += size;
      }
    };

    readBox(0, arrayBuffer.byteLength);
    return new Blob([arrayBuffer], { type: 'video/mp4' });
  } catch (err) {
    console.warn('Gagal memodifikasi header durasi MP4:', err);
    return blob;
  }
};

// Simpan file langsung ke Galeri (via Web Share di iOS dengan tombol 'Simpan Gambar/Video', atau download otomatis di Android/Desktop)
const saveOrDownloadFile = async (blob, filename, mimeType, isPhoto = true) => {
  const isIOS = () => {
    if (typeof navigator === 'undefined') return false;
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  };

  const triggerAnchorDownload = () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = filename;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // Khusus perangkat iOS (iPhone / iPad), Web Share API menampilkan lembar aksi asli iOS
  // yang memiliki tombol "Simpan Gambar" / "Simpan Video" untuk langsung masuk ke Galeri Foto (Rol Kamera)
  if (isIOS() && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: mimeType || blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Twibbon Adhigana Informatika 2026',
        });
        return true;
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return false;
      }
      console.warn('Web Share API error, beralih ke unduhan biasa:', err);
    }
  }

  // Fallback standar (Di Android & Desktop langsung otomatis terunduh dan terbaca di Galeri)
  triggerAnchorDownload();
  return true;
};

export default function App() {
  const [config, setConfig] = useState(defaultConfig);
  const [userImageSrc, setUserImageSrc] = useState(null);
  const [photoState, setPhotoState] = useState({
    x: 0,
    y: 0,
    scale: 1,
    baseScale: 1,
    rotation: 0,
  });

  const [mabaInfo, setMabaInfo] = useState({
    name: '',
    groupOrNim: '',
    showOnTwibbon: false,
  });

  // Auto-Update & Real-time Sync
  const currentBuildTimeRef = useRef(
    typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : Date.now()
  );
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);

  // Modals & Notifications
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRenderOpen, setIsRenderOpen] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatus, setRenderStatus] = useState('');
  const [toast, setToast] = useState(null);

  // Canvas & Media Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const photoCanvasRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#ef4444', '#f87171', '#fbbf24', '#ffffff'],
    });
  };

  // Optimasi otomatis untuk perangkat hemat daya/kentang (cegah OOM crash saat upload kamera 48MP-108MP)
  const optimizeImageFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawDataUrl = e.target.result;
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 1440; // Resolusi optimal tajam di kanvas 1080p, hemat RAM 95%
          let { width, height } = img;
          if (width <= MAX_DIM && height <= MAX_DIM && file.size < 1.5 * 1024 * 1024) {
            return resolve(rawDataUrl);
          }

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          try {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            const isPng = file.type === 'image/png';
            const optimized = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.90);
            resolve(optimized);
          } catch (_) {
            resolve(rawDataUrl);
          }
        };
        img.onerror = () => resolve(rawDataUrl);
        img.src = rawDataUrl;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  // Handle Photo File Upload
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih file gambar (JPG, PNG, atau WEBP)!', 'error');
      return;
    }

    try {
      const optimizedUrl = await optimizeImageFile(file);
      if (optimizedUrl) {
        setUserImageSrc(optimizedUrl);
        showToast('Foto berhasil dimuat! Silakan atur posisi agar pas.');
      } else {
        showToast('Gagal memuat file gambar.', 'error');
      }
    } catch (_) {
      showToast('Gagal memproses gambar.', 'error');
    }
    e.target.value = '';
  };

  // Handle Camera Capture
  const handleCameraCapture = (dataUrl) => {
    setUserImageSrc(dataUrl);
    showToast('Foto selfie berhasil diambil!');
  };

  const [isPhotoDownloading, setIsPhotoDownloading] = useState(false);

  // LIVE AUTO-UPDATE & REAL-TIME CONFIG SYNC
  useEffect(() => {
    let isChecking = false;

    const checkForUpdates = async () => {
      if (isChecking) return;
      isChecking = true;

      try {
        const versionUrl = resolveAssetUrl('version.json');
        const res = await fetch(`${versionUrl}?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });

        if (res.ok) {
          const data = await res.json();

          // 1. Live Sync Config (Judul, Caption, dll) langsung terupdate di layar tanpa perlu reload
          if (data.config && typeof data.config === 'object') {
            setConfig((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(data.config)) {
                return { ...prev, ...data.config };
              }
              return prev;
            });
          }

          // 2. Deteksi Rilis Kode / Build Baru
          const serverBuild = Number(data.buildTime);
          const currentBuild = Number(currentBuildTimeRef.current);

          if (serverBuild && currentBuild && serverBuild > currentBuild) {
            setNewVersionAvailable(true);

            // Jika user belum mengunggah foto dan tidak sedang proses download, reload otomatis secara senyap!
            if (!userImageSrc && !isRenderOpen && !isPhotoDownloading) {
              window.location.reload();
            }
          }
        }
      } catch (_) {
        // Abaikan saat offline
      } finally {
        isChecking = false;
      }
    };

    checkForUpdates();
    const interval = setInterval(checkForUpdates, 25000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkForUpdates);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkForUpdates);
    };
  }, [userImageSrc, isRenderOpen, isPhotoDownloading]);

  // 1. DOWNLOAD FOTO STATIS (PNG HD 1080x1080) - 100% INSTAN & KEBAL BUG IOS WEBKIT
  const handleDownloadPhoto = async () => {
    if (isPhotoDownloading) return;
    if (!userImageSrc) {
      showToast('Harap pilih foto terlebih dahulu sebelum download!', 'error');
      return;
    }

    setIsPhotoDownloading(true);

    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 1080;
      exportCanvas.height = 1080;
      const ctx = exportCanvas.getContext('2d');

      const CIRCLE_X = config.circle_center_x || 536;
      const CIRCLE_Y = config.circle_center_y || 543;
      const CIRCLE_RADIUS = config.circle_radius || 330;

      // 1. Muat gambar foto user langsung (tanpa perantara hidden canvas agar tidak di-purge oleh iOS Safari)
      const uImg = new Image();
      if (userImageSrc.startsWith('http://') || userImageSrc.startsWith('https://')) {
        uImg.crossOrigin = 'anonymous';
      }
      uImg.src = userImageSrc;
      await new Promise((resolve, reject) => {
        if (uImg.complete && uImg.naturalWidth > 0) return resolve();
        uImg.onload = resolve;
        uImg.onerror = () => reject(new Error('Gagal memproses gambar foto'));
      });

      // 2. Gambar foto user di dalam lingkaran sesuai posisi drag/zoom/rotate
      ctx.save();
      ctx.beginPath();
      ctx.arc(CIRCLE_X, CIRCLE_Y, CIRCLE_RADIUS, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.translate(CIRCLE_X + photoState.x, CIRCLE_Y + photoState.y);
      ctx.rotate((photoState.rotation * Math.PI) / 180);
      ctx.scale(photoState.scale, photoState.scale);
      ctx.drawImage(uImg, -uImg.width / 2, -uImg.height / 2);
      ctx.restore();

      // 3. Muat dan gambar bingkai twibbon
      const frameImg = new Image();
      frameImg.crossOrigin = 'anonymous';
      frameImg.src = resolveAssetUrl(config.static_frame, 'images/frame.png');
      await new Promise((resolve, reject) => {
        if (frameImg.complete && frameImg.naturalWidth > 0) return resolve();
        frameImg.onload = resolve;
        frameImg.onerror = () => reject(new Error('Gagal memuat bingkai twibbon'));
      });
      ctx.drawImage(frameImg, 0, 0, 1080, 1080);

      // 4. Tambahkan identitas mahasiswa jika diaktifkan
      if (mabaInfo.showOnTwibbon && mabaInfo.name) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px "Space Grotesk", sans-serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        const textY = 930;
        ctx.fillText(mabaInfo.name.toUpperCase(), 540, textY);

        if (mabaInfo.groupOrNim) {
          ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = '#f87171';
          ctx.fillText(mabaInfo.groupOrNim, 540, textY + 36);
        }
        ctx.restore();
      }

      // 5. Ekspor Blob PNG & Simpan ke Galeri / Download
      const blob = await new Promise((resolve) => exportCanvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Gagal menghasilkan file gambar PNG');

      const cleanTitle = (config.campaign_title || 'Twibbon').replace(/\s+/g, '_');
      const filename = `Twibbon_${cleanTitle}.png`;
      await saveOrDownloadFile(blob, filename, 'image/png', true);

      setIsPhotoDownloading(false);
      triggerCelebration();
      showToast('Foto Twibbon berhasil diproses! Tersimpan di Galeri / Unduhan.');
    } catch (err) {
      setIsPhotoDownloading(false);
      console.error(err);
      showToast('Gagal mendownload foto: ' + err.message, 'error');
    }
  };

  // 2. DOWNLOAD VIDEO (100% PURE CLIENT-SIDE / SERVERLESS / STATIC WEB)
  const handleDownloadVideo = async () => {
    if (isRenderOpen) return; // Prevent double-click race conditions
    if (!userImageSrc) {
      showToast('Harap pilih foto terlebih dahulu sebelum download video!', 'error');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsRenderOpen(true);
    setRenderProgress(10);
    setRenderStatus('Menyiapkan pemrosesan video...');

    // Perekaman langsung di browser perangkat (Serverless, aman saat laptop mati)
    await handleClientRecording(video, canvas);
  };

  const handleClientRecording = async (video, canvas) => {
    if (!video || !canvas) {
      setIsRenderOpen(false);
      showToast('Gagal memproses video.', 'error');
      return;
    }

    if (typeof window.MediaRecorder === 'undefined' || !canvas.captureStream) {
      setIsRenderOpen(false);
      showToast('Browser Anda tidak mendukung perekaman video HTML5.', 'error');
      return;
    }

    if (!video.paused) {
      video.pause();
    }

    const wasMuted = video.muted;
    try {
      video.muted = true; // Hindari feedback echo saat proses perekaman canvas
    } catch (_) {}

    setRenderProgress(10);
    setRenderStatus('Menyiapkan perekaman di perangkat...');

    try {
      // 1. Deteksi format video terbaik
      const mimeCandidates = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const selectedMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      setRenderProgress(15);
      setRenderStatus('Memuat audio digital HD...');

      // 2. Audio via Web Audio API
      let audioContext = null;
      let audioSourceNode = null;
      let audioTrack = null;

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioContext = new AudioContextClass();
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }

          const audioUrl = resolveAssetUrl(config.theme_audio, 'audio/theme.mp3');
          const audioRes = await fetch(audioUrl);
          if (audioRes.ok) {
            const audioData = await audioRes.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(audioData);

            const audioDest = audioContext.createMediaStreamDestination();
            audioSourceNode = audioContext.createBufferSource();
            audioSourceNode.buffer = audioBuffer;
            audioSourceNode.connect(audioDest);
            audioTrack = audioDest.stream.getAudioTracks()[0];
          }
        }
      } catch (audioErr) {
        console.warn('Web Audio direct load note:', audioErr);
      }

      if (!audioTrack) {
        try {
          const vStream = video.captureStream ? video.captureStream() : (video.mozCaptureStream ? video.mozCaptureStream() : null);
          if (vStream && vStream.getAudioTracks().length > 0) {
            audioTrack = vStream.getAudioTracks()[0];
          }
        } catch (_) {}
      }

      // 3. Gabungkan video track (Canvas 30 FPS) + audio track
      const canvasStream = canvas.captureStream(30);
      const combinedTracks = [...canvasStream.getVideoTracks()];
      if (audioTrack) {
        combinedTracks.push(audioTrack);
      }
      const combinedStream = new MediaStream(combinedTracks);

      // 4. Setup MediaRecorder (Adaptif terhadap spesifikasi perangkat)
      const isLowEndDevice = typeof navigator !== 'undefined' && (
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
        (navigator.deviceMemory && navigator.deviceMemory <= 4)
      );

      const recorderOptions = {};
      if (selectedMime) recorderOptions.mimeType = selectedMime;
      recorderOptions.videoBitsPerSecond = isLowEndDevice ? 3500000 : 8000000;
      if (audioTrack) recorderOptions.audioBitsPerSecond = isLowEndDevice ? 128000 : 192000;

      const recorder = new MediaRecorder(combinedStream, recorderOptions);
      const recordedChunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      const totalDuration = video.duration && !isNaN(video.duration) && video.duration > 0 ? video.duration : 17.97;
      const durationMs = Math.round(totalDuration * 1000);

      const downloadFinishedBlob = async (finalBlob, ext) => {
        const cleanTitle = (config.campaign_title || 'Twibbon').replace(/\s+/g, '_');
        const filename = `Video_Twibbon_${cleanTitle}.${ext}`;
        const mimeType = ext === 'mp4' ? 'video/mp4' : 'video/webm';
        await saveOrDownloadFile(finalBlob, filename, mimeType, false);

        setRenderProgress(100);
        setRenderStatus('Selesai! Video berhasil diunduh.');

        setTimeout(() => {
          setIsRenderOpen(false);
          triggerCelebration();
          showToast(`Video Twibbon berhasil didownload (${ext.toUpperCase()})! Durasi pas 18 detik.`);
        }, 500);
      };

      recorder.onstop = async () => {
        try {
          canvasStream.getTracks().forEach((t) => t.stop());
          combinedStream.getTracks().forEach((t) => t.stop());
        } catch (_) {}

        const isMp4 = (selectedMime && selectedMime.includes('mp4')) || (!selectedMime.includes('webm'));
        const rawBlob = new Blob(recordedChunks, { type: selectedMime || (isMp4 ? 'video/mp4' : 'video/webm') });

        if (isMp4) {
          setRenderStatus('Menyempurnakan durasi video MP4 (18 detik)...');
          setRenderProgress(96);
          try {
            const fixedBlob = await fixMp4Duration(rawBlob, totalDuration);
            await downloadFinishedBlob(fixedBlob, 'mp4');
          } catch (fixErr) {
            console.warn('Gagal patch durasi MP4, unduh file asli:', fixErr);
            await downloadFinishedBlob(rawBlob, 'mp4');
          }
        } else {
          setRenderStatus('Menyempurnakan durasi video (18 detik)...');
          setRenderProgress(96);
          try {
            const fixedBlob = await new Promise((resolve, reject) => {
              try {
                ysFixWebmDuration(rawBlob, durationMs, (fixed) => resolve(fixed));
              } catch (e) {
                reject(e);
              }
            });
            await downloadFinishedBlob(fixedBlob, 'webm');
          } catch (fixErr) {
            console.warn('fixWebmDuration error, fallback to raw blob:', fixErr);
            await downloadFinishedBlob(rawBlob, 'webm');
          }
        }

        if (audioContext && audioContext.state !== 'closed') {
          try { audioContext.close(); } catch (_) {}
        }
      };

      // 5. Seek video ke detik 0
      setRenderProgress(20);
      setRenderStatus('Sinkronisasi frame awal video...');

      await new Promise((resolve) => {
        if (video.currentTime <= 0.05) return resolve();
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = 0;
        setTimeout(resolve, 600);
      });

      // 6. Mulai perekaman
      setRenderProgress(25);
      setRenderStatus('Merekam animasi & audio di perangkat (0%)...');

      recorder.start(200);
      if (audioSourceNode) {
        audioSourceNode.start(0);
      }

      let recordingFinished = false;
      const stopRecordingSession = () => {
        if (recordingFinished) return;
        recordingFinished = true;
        clearInterval(progressInterval);
        clearTimeout(maxTimeout);

        try { video.pause(); } catch (_) {}
        try { video.muted = wasMuted; } catch (_) {}
        try { if (audioSourceNode) audioSourceNode.stop(); } catch (_) {}
        if (recorder.state === 'recording') {
          recorder.stop();
        }
        try {
          canvasStream.getTracks().forEach((t) => t.stop());
          combinedStream.getTracks().forEach((t) => t.stop());
        } catch (_) {}
      };

      const progressInterval = setInterval(() => {
        if (video && video.currentTime > 0) {
          const percent = Math.min(94, Math.round(25 + (video.currentTime / totalDuration) * 69));
          setRenderProgress(percent);
          setRenderStatus(`Merekam animasi & audio (${Math.round((video.currentTime / totalDuration) * 100)}%)...`);
        }
      }, 200);

      const maxTimeout = setTimeout(() => {
        stopRecordingSession();
      }, (totalDuration + 1.5) * 1000);

      video.onended = () => {
        stopRecordingSession();
      };

      try {
        await video.play();
      } catch (playErr) {
        stopRecordingSession();
        setIsRenderOpen(false);
        showToast('Gagal memutar video: ' + playErr.message, 'error');
      }

    } catch (err) {
      try { video.muted = wasMuted; } catch (_) {}
      console.error('Client recording error:', err);
      setIsRenderOpen(false);
      showToast('Gagal memproses video: ' + err.message, 'error');
    }
  };

  // 3. SALIN CAPTION INSTAGRAM
  const handleCopyCaption = () => {
    let caption = config.caption_template || '';
    const studentName = mabaInfo.name.trim();
    if (studentName) {
      caption = caption
        .replace('(Nama Lengkap)', studentName)
        .replace('[Nama Lengkap]', studentName)
        .replace('[Isi Nama Kamu]', studentName);
    }

    navigator.clipboard
      .writeText(caption)
      .then(() => {
        triggerCelebration();
        showToast('Caption Instagram resmi berhasil disalin ke clipboard!');
      })
      .catch(() => {
        showToast('Gagal menyalin caption secara otomatis.', 'error');
      });
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#e0e2ec] flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Top Navbar */}
      <Navbar
        config={config}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Floating Auto-Update Banner (Tampil saat ada rilis baru jika user sedang mengedit foto) */}
      {newVersionAvailable && (
        <aside
          role="status"
          aria-live="polite"
          onClick={() => window.location.reload()}
          className="fixed top-16 z-50 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-2xl text-[11px] sm:text-xs font-semibold flex items-center gap-2 animate-bounce cursor-pointer border border-white/20 select-none hover:scale-105 active:scale-95 transition"
          title="Klik untuk memuat versi terbaru"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Pembaruan baru tersedia! Ketuk untuk perbarui</span>
        </aside>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1 w-full flex flex-col items-center">
        {/* Banner Tagline */}
        <div className="w-full text-center mb-4 sm:mb-6">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-red-900/20 border border-red-700/30 text-[10px] sm:text-xs font-semibold text-red-400 mb-1.5 sm:mb-2">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 animate-pulse"></span>
            Auto Chroma Key • Foto & Video Twibbon 1080p
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-display tracking-tight px-2">
            {config.campaign_title}
          </h2>
          <p className="text-[11px] sm:text-xs md:text-sm text-gray-400 max-w-lg mx-auto mt-1 px-3">
            {config.description}
          </p>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start justify-items-center">
          {/* Left Column: Preview Canvas & Playback Bar */}
          <div className="lg:col-span-6 w-full flex justify-center">
            <TwibbonCanvas
              config={config}
              userImageSrc={userImageSrc}
              photoState={photoState}
              setPhotoState={setPhotoState}
              onPickPhoto={() => document.querySelector('input[type="file"]')?.click()}
              videoRef={videoRef}
              canvasRef={canvasRef}
              photoCanvasRef={photoCanvasRef}
              mabaInfo={mabaInfo}
            />
          </div>

          {/* Right Column: Controls, Sliders, & Action Buttons */}
          <div className="lg:col-span-6 w-full flex justify-center">
            <ControlPanel
              config={config}
              photoState={photoState}
              setPhotoState={setPhotoState}
              onFileSelect={handleFileSelect}
              onOpenCamera={() => setIsCameraOpen(true)}
              hasPhoto={!!userImageSrc}
              onDownloadPhoto={handleDownloadPhoto}
              onDownloadVideo={handleDownloadVideo}
              onCopyCaption={handleCopyCaption}
              mabaInfo={mabaInfo}
              setMabaInfo={setMabaInfo}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#232733] bg-[#0c0d12] py-4 text-center text-xs text-gray-400">
        <p>
          &copy; 2026 {config.campaign_title} • Panitia Ospek Jurusan Informatika
        </p>
      </footer>

      {/* Modals */}
      <ShareModal
        config={config}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        onCopyLink={() => showToast('Tautan berhasil disalin!')}
      />
      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
      <RenderModal
        isOpen={isRenderOpen}
        progress={renderProgress}
        statusText={renderStatus}
      />
    </div>
  );
}
