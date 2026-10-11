import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import ysFixWebmDuration from 'fix-webm-duration';
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

  // Handle Photo File Upload
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih file gambar (JPG, PNG, atau WEBP)!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUserImageSrc(event.target.result);
      showToast('Foto berhasil dimuat! Silakan atur posisi agar pas.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Camera Capture
  const handleCameraCapture = (dataUrl) => {
    setUserImageSrc(dataUrl);
    showToast('Foto selfie berhasil diambil!');
  };

  const [isPhotoDownloading, setIsPhotoDownloading] = useState(false);

  // 1. DOWNLOAD FOTO STATIS (PNG HD 1080x1080) - 100% INSTAN DI BROWSER
  const handleDownloadPhoto = () => {
    if (isPhotoDownloading) return;
    if (!userImageSrc) {
      showToast('Harap pilih foto terlebih dahulu sebelum download!', 'error');
      return;
    }

    const canvas = canvasRef.current;
    const photoCanvas = photoCanvasRef.current;
    if (!canvas || !photoCanvas) return;

    setIsPhotoDownloading(true);

    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 1080;
      exportCanvas.height = 1080;
      const ctx = exportCanvas.getContext('2d');

      const CIRCLE_X = config.circle_center_x || 536;
      const CIRCLE_Y = config.circle_center_y || 543;
      const CIRCLE_RADIUS = config.circle_radius || 330;

      // 1. Draw photo clipped to circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(CIRCLE_X, CIRCLE_Y, CIRCLE_RADIUS, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(photoCanvas, 0, 0, 1080, 1080);
      ctx.restore();

      // 2. Draw frame image
      const frameImg = new Image();
      frameImg.crossOrigin = 'anonymous';
      frameImg.src = resolveAssetUrl(config.static_frame, 'images/frame.png');

      frameImg.onload = () => {
        ctx.drawImage(frameImg, 0, 0, 1080, 1080);

        // 3. Draw Maba Name & NIM if enabled
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

        // Export to PNG blob
        exportCanvas.toBlob((blob) => {
          setIsPhotoDownloading(false);
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const cleanTitle = (config.campaign_title || 'Twibbon').replace(/\s+/g, '_');
          a.download = `Twibbon_${cleanTitle}.png`;
          a.href = url;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 10000);

          triggerCelebration();
          showToast('Foto Twibbon berhasil didownload!');
        }, 'image/png');
      };

      // Fallback if frame already cached
      if (frameImg.complete && frameImg.naturalWidth > 0) {
        frameImg.onload();
      }
    } catch (err) {
      setIsPhotoDownloading(false);
      console.error(err);
      showToast('Gagal mendownload foto: ' + err.message, 'error');
    }
  };

  // 2. DOWNLOAD VIDEO - 100% CLIENT-SIDE DI HP/BROWSER DENGAN WEB AUDIO & FIX WEBM DURATION
  const handleDownloadVideo = async () => {
    if (isRenderOpen) return; // Prevent double-click race conditions
    if (!userImageSrc) {
      showToast('Harap pilih foto terlebih dahulu sebelum download video!', 'error');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const photoCanvas = photoCanvasRef.current;
    if (!video || !canvas || !photoCanvas) return;

    if (!video.paused) {
      video.pause();
    }

    const wasMuted = video.muted;
    try {
      video.muted = true; // Keep video tag muted so no speaker echo occurs during recording
    } catch (_) {}

    setIsRenderOpen(true);
    setRenderProgress(5);
    setRenderStatus('Menyiapkan perekaman di perangkat Anda...');

    // If browser doesn't support MediaRecorder or canvas captureStream, fallback to server
    if (typeof window.MediaRecorder === 'undefined' || !canvas.captureStream) {
      return handleServerRenderFallback();
    }

    try {
      // 1. Deteksi format video terbaik yang didukung browser/device
      const mimeCandidates = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const selectedMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      setRenderProgress(10);
      setRenderStatus('Memuat audio digital HD...');

      // 2. Web Audio API untuk inject audio digital murni 100% tanpa noise & tanpa pengaruh mute switch HP
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

      // Fallback audio track from video element if Web Audio failed
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

      // 4. Setup MediaRecorder
      const recorderOptions = {};
      if (selectedMime) recorderOptions.mimeType = selectedMime;
      recorderOptions.videoBitsPerSecond = 8000000; // 8 Mbps High Definition
      if (audioTrack) recorderOptions.audioBitsPerSecond = 192000;

      const recorder = new MediaRecorder(combinedStream, recorderOptions);
      const recordedChunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      const totalDuration = video.duration && !isNaN(video.duration) && video.duration > 0 ? video.duration : 17.97;
      const durationMs = Math.round(totalDuration * 1000);

      const downloadFinishedBlob = (finalBlob, ext) => {
        const url = URL.createObjectURL(finalBlob);
        const a = document.createElement('a');
        const cleanTitle = (config.campaign_title || 'Twibbon').replace(/\s+/g, '_');
        a.download = `Video_Twibbon_${cleanTitle}.${ext}`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);

        setRenderProgress(100);
        setRenderStatus('Selesai! Video berhasil diunduh.');

        setTimeout(() => {
          setIsRenderOpen(false);
          triggerCelebration();
          showToast('Video Twibbon berhasil didownload!');
        }, 500);
      };

      recorder.onstop = async () => {
        // Free stream hardware tracks
        try {
          canvasStream.getTracks().forEach((t) => t.stop());
          combinedStream.getTracks().forEach((t) => t.stop());
        } catch (_) {}

        const isWebm = (selectedMime && selectedMime.includes('webm')) || (!selectedMime.includes('mp4'));
        const rawBlob = new Blob(recordedChunks, { type: selectedMime || (isWebm ? 'video/webm' : 'video/mp4') });

        if (isWebm) {
          setRenderStatus('Menyempurnakan durasi video (18 detik)...');
          setRenderProgress(96);
          try {
            // FIX DURASI WEBM DENGAN ysFixWebmDuration SUPAYA DIBACA 18 DETIK UTUH OLEH WHATSAPP & PLAYER HP
            const fixedBlob = await new Promise((resolve, reject) => {
              try {
                ysFixWebmDuration(rawBlob, durationMs, (fixed) => resolve(fixed));
              } catch (e) {
                reject(e);
              }
            });
            downloadFinishedBlob(fixedBlob, 'webm');
          } catch (fixErr) {
            console.warn('fixWebmDuration error, fallback to raw blob:', fixErr);
            downloadFinishedBlob(rawBlob, 'webm');
          }
        } else {
          downloadFinishedBlob(rawBlob, 'mp4');
        }

        if (audioContext && audioContext.state !== 'closed') {
          try { audioContext.close(); } catch (_) {}
        }
      };

      // 5. Seek video ke detik 0 sebelum mulai merekam
      setRenderProgress(15);
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

      // 6. Mulai rekaman & audio
      setRenderProgress(20);
      setRenderStatus('Merekam animasi & audio di HP/Browser (0%)...');

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
          const percent = Math.min(94, Math.round(20 + (video.currentTime / totalDuration) * 74));
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
      console.error('Client recording error, falling back to server:', err);
      handleServerRenderFallback();
    }
  };

  // Fallback Server Render via FFmpeg jika browser lama tidak mendukung MediaRecorder
  const handleServerRenderFallback = async () => {
    const photoCanvas = photoCanvasRef.current;
    if (!photoCanvas) {
      setIsRenderOpen(false);
      showToast('Gagal memproses render video.', 'error');
      return;
    }

    setRenderProgress(30);
    setRenderStatus('Merender video di server FFmpeg...');

    let p = 30;
    const timer = setInterval(() => {
      if (p < 88) {
        p += 5;
        setRenderProgress(p);
      }
    }, 400);

    try {
      const photoBlob = await new Promise((resolve) => photoCanvas.toBlob(resolve, 'image/png'));
      const formData = new FormData();
      formData.append('photo', photoBlob, 'photo.png');

      const res = await fetch('/api/render-video', {
        method: 'POST',
        body: formData,
      });

      clearInterval(timer);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Gagal render video (HTTP ${res.status})`);
      }

      setRenderProgress(100);
      setRenderStatus('Selesai! Mengunduh video...');

      const vBlob = await res.blob();
      const url = URL.createObjectURL(vBlob);
      const a = document.createElement('a');
      a.download = `Video_Twibbon_${(config.campaign_title || 'Twibbon').replace(/\s+/g, '_')}.mp4`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setTimeout(() => {
        setIsRenderOpen(false);
        triggerCelebration();
        showToast('Video Twibbon berhasil didownload!');
      }, 600);
    } catch (err) {
      clearInterval(timer);
      setIsRenderOpen(false);
      console.error('Server FFmpeg fallback gagal:', err);
      showToast(err.message || 'Gagal memproses video.', 'error');
    }
  };

  // 3. SALIN CAPTION INSTAGRAM
  const handleCopyCaption = () => {
    let caption = config.caption_template || '';
    const studentName = mabaInfo.name.trim() || '[Isi Nama Kamu]';
    caption = caption.replace('[Isi Nama Kamu]', studentName);

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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full flex flex-col items-center">
        {/* Banner Tagline */}
        <div className="w-full text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/20 border border-red-700/30 text-xs font-semibold text-red-400 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            Auto Chroma Key • Foto & Video Twibbon 1080p
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
            {config.campaign_title}
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto mt-1">
            {config.description}
          </p>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start justify-items-center">
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
