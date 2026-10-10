import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import Navbar from './components/Navbar';
import TwibbonCanvas from './components/TwibbonCanvas';
import ControlPanel from './components/ControlPanel';
import ShareModal from './components/ShareModal';
import GuideModal from './components/GuideModal';
import CameraModal from './components/CameraModal';
import RenderModal from './components/RenderModal';
import Toast from './components/Toast';
import defaultConfig from './config.json';

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

  // 1. DOWNLOAD FOTO STATIS (PNG HD 1080x1080) - 100% INSTAN DI BROWSER
  const handleDownloadPhoto = () => {
    if (!userImageSrc) {
      showToast('Harap pilih foto terlebih dahulu sebelum download!', 'error');
      return;
    }

    const canvas = canvasRef.current;
    const photoCanvas = photoCanvasRef.current;
    if (!canvas || !photoCanvas) return;

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
      frameImg.src = config.static_frame || '/images/frame.png';

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
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const cleanTitle = (config.campaign_title || 'Twibbon').replace(/\s+/g, '_');
          a.download = `Twibbon_${cleanTitle}.png`;
          a.href = url;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          triggerCelebration();
          showToast('Foto Twibbon berhasil didownload!');
        }, 'image/png');
      };

      // Fallback if frame already cached
      if (frameImg.complete && frameImg.naturalWidth > 0) {
        frameImg.onload();
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal mendownload foto: ' + err.message, 'error');
    }
  };

  // 2. DOWNLOAD VIDEO (MP4) - HYBRID AUTO-SWITCH (SERVER FFMPEG OR CLIENT-SIDE RECORDER)
  const handleDownloadVideo = async () => {
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

    setIsRenderOpen(true);
    setRenderProgress(10);
    setRenderStatus('Menyiapkan komposit video 1080p...');

    // Extract photo blob for backend if needed
    const photoBlob = await new Promise((resolve) => photoCanvas.toBlob(resolve, 'image/png'));

    // Check if backend API is reachable
    let backendAvailable = false;
    try {
      const ping = await fetch('/api/render-video', { method: 'HEAD' });
      if (ping.status !== 404) {
        backendAvailable = true;
      }
    } catch (e) {
      backendAvailable = false;
    }

    // A) Backend FFmpeg Available
    if (backendAvailable) {
      setRenderProgress(30);
      setRenderStatus('Mengirim ke server FFmpeg 1080p...');

      let p = 30;
      const timer = setInterval(() => {
        if (p < 85) {
          p += 5;
          setRenderProgress(p);
        }
      }, 400);

      try {
        const formData = new FormData();
        formData.append('photo', photoBlob, 'photo.png');

        const res = await fetch('/api/render-video', {
          method: 'POST',
          body: formData,
        });

        clearInterval(timer);
        if (!res.ok) throw new Error('Gagal render video di server');

        setRenderProgress(100);
        setRenderStatus('Selesai! Menyimpan video...');

        const vBlob = await res.blob();
        const url = URL.createObjectURL(vBlob);
        const a = document.createElement('a');
        a.download = `Video_Twibbon_${(config.campaign_title || 'Adhigana').replace(/\s+/g, '_')}.mp4`;
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
        return;
      } catch (err) {
        clearInterval(timer);
        console.warn('Backend FFmpeg gagal, beralih ke perekaman client-side browser...', err);
      }
    }

    // B) Client-side MediaRecorder (100% Serverless di Browser HP)
    try {
      setRenderProgress(25);
      setRenderStatus('Merekam animasi langsung di browser...');

      // Find supported mimeType
      const mimeTypes = [
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const selectedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const canvasStream = canvas.captureStream(30);
      let combinedStream = canvasStream;

      // Capture audio from video if possible
      try {
        const audioStream = video.captureStream ? video.captureStream() : (video.mozCaptureStream ? video.mozCaptureStream() : null);
        if (audioStream && audioStream.getAudioTracks().length > 0) {
          combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
          ]);
        }
      } catch (e) {
        console.warn('Audio capture stream fallback:', e);
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 8000000,
      });

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const isMp4 = selectedMime.toLowerCase().includes('mp4');
        const ext = isMp4 ? 'mp4' : 'webm';
        const blob = new Blob(chunks, { type: selectedMime || 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = `Video_Twibbon_${(config.campaign_title || 'Adhigana').replace(/\s+/g, '_')}.${ext}`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setRenderProgress(100);
        setRenderStatus('Selesai!');

        setTimeout(() => {
          setIsRenderOpen(false);
          triggerCelebration();
          showToast('Video Twibbon berhasil didownload!');
        }, 600);
      };

      // Rewind video and play through while recording
      video.currentTime = 0;
      recorder.start();

      const duration = video.duration || 15.0;
      const progressTracker = setInterval(() => {
        if (video.currentTime > 0) {
          const prog = 25 + (video.currentTime / duration) * 70;
          setRenderProgress(Math.min(95, prog));
        }
      }, 300);

      video.onended = () => {
        clearInterval(progressTracker);
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      };

      video.play().catch((err) => {
        clearInterval(progressTracker);
        if (recorder.state === 'recording') recorder.stop();
        setIsRenderOpen(false);
        showToast('Gagal memutar video: ' + err.message, 'error');
      });
    } catch (err) {
      setIsRenderOpen(false);
      console.error(err);
      showToast('Gagal merekam video di browser: ' + err.message, 'error');
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
