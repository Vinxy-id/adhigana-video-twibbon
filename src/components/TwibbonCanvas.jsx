import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, ImagePlus, Sparkles, Crosshair, Laptop, Film } from 'lucide-react';

export default function TwibbonCanvas({
  config,
  userImageSrc,
  photoState,
  setPhotoState,
  onPickPhoto,
  videoRef,
  canvasRef,
  photoCanvasRef,
  mabaInfo,
}) {
  const containerRef = useRef(null);
  const videoOffscreenRef = useRef(null);
  if (!videoOffscreenRef.current) {
    const vCanvas = document.createElement('canvas');
    vCanvas.width = 1080;
    vCanvas.height = 1080;
    videoOffscreenRef.current = vCanvas;
  }
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(11.0);
  const [duration, setDuration] = useState(15.0);
  const [userImg, setUserImg] = useState(null);
  const [staticFrameImg, setStaticFrameImg] = useState(null);

  const CIRCLE_X = config.circle_center_x || 536;
  const CIRCLE_Y = config.circle_center_y || 543;
  const CIRCLE_RADIUS = config.circle_radius || 330;

  // Touch & Mouse drag tracking
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialPhotoX: 0,
    initialPhotoY: 0,
    initialPinchDistance: 0,
    initialScale: 1,
  });

  const resolveAssetUrl = (url, fallback) => {
    const target = url || fallback;
    if (!target) return '';
    if (target.startsWith('http') || target.startsWith('data:') || target.startsWith('blob:')) {
      return target;
    }
    const clean = target.replace(/^\.?\//, '');
    const base = import.meta.env.BASE_URL || './';
    return base.endsWith('/') ? base + clean : base + '/' + clean;
  };

  // Load static frame image
  useEffect(() => {
    const frame = new Image();
    frame.crossOrigin = 'anonymous';
    frame.src = resolveAssetUrl(config.static_frame, 'images/frame.png');
    frame.onload = () => setStaticFrameImg(frame);
  }, [config.static_frame]);

  // Load user image
  useEffect(() => {
    if (!userImageSrc) {
      setUserImg(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = userImageSrc;
    img.onload = () => {
      setUserImg(img);
      // Auto fit initial scale
      const baseScale = Math.max((CIRCLE_RADIUS * 2) / img.width, (CIRCLE_RADIUS * 2) / img.height);
      setPhotoState((prev) => ({
        ...prev,
        x: 0,
        y: 0,
        scale: baseScale,
        baseScale: baseScale,
        rotation: 0,
      }));
    };
  }, [userImageSrc, CIRCLE_RADIUS, setPhotoState]);

  // Update Photo Canvas (Offscreen 1080x1080)
  const updatePhotoCanvas = useCallback(() => {
    const pCanvas = photoCanvasRef.current;
    if (!pCanvas) return;
    const pCtx = pCanvas.getContext('2d');
    pCtx.fillStyle = '#000000';
    pCtx.fillRect(0, 0, 1080, 1080);

    if (userImg) {
      pCtx.save();
      pCtx.translate(CIRCLE_X + photoState.x, CIRCLE_Y + photoState.y);
      pCtx.rotate((photoState.rotation * Math.PI) / 180);
      pCtx.scale(photoState.scale, photoState.scale);
      pCtx.drawImage(userImg, -userImg.width / 2, -userImg.height / 2);
      pCtx.restore();
    }
  }, [photoCanvasRef, userImg, CIRCLE_X, CIRCLE_Y, photoState]);

  // Draw current frame to composite canvas
  const renderComposite = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const pCanvas = photoCanvasRef.current;
    if (!canvas || !pCanvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1080, 1080);

    const curTime = video ? video.currentTime : 11.0;

    // Mode 1: Static Twibbon / Main Twibbon Frame (Time >= 9.5s or no video)
    if (!video || curTime >= 9.5) {
      // 1. Draw user photo clipped to circle
      if (userImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(CIRCLE_X, CIRCLE_Y, CIRCLE_RADIUS, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(pCanvas, 0, 0, 1080, 1080);
        ctx.restore();
      }

      // 2. Draw live animated video with transparent circular twibbon hole (or static frame fallback)
      if (video && video.readyState >= 2) {
        const vCanvas = videoOffscreenRef.current;
        const vCtx = vCanvas.getContext('2d');
        vCtx.clearRect(0, 0, 1080, 1080);
        vCtx.drawImage(video, 0, 0, 1080, 1080);

        // Punch out circular frame hole so user photo underneath shows through
        vCtx.save();
        vCtx.globalCompositeOperation = 'destination-out';
        vCtx.beginPath();
        vCtx.arc(CIRCLE_X, CIRCLE_Y, CIRCLE_RADIUS - 3, 0, Math.PI * 2);
        vCtx.fill();
        vCtx.restore();

        // Draw animated video frame overlay on top of photo
        ctx.drawImage(vCanvas, 0, 0, 1080, 1080);
      } else if (staticFrameImg && staticFrameImg.complete) {
        ctx.drawImage(staticFrameImg, 0, 0, 1080, 1080);
      }

      // 3. Stamp Maba Name & NIM if enabled
      if (mabaInfo && mabaInfo.showOnTwibbon && mabaInfo.name) {
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
          ctx.fillStyle = '#f87171'; // red-400
          ctx.fillText(mabaInfo.groupOrNim, 540, textY + 36);
        }
        ctx.restore();
      }
    } else {
      // Mode 2: Video Intro Animation (Time < 9.5s) - 100% clean video, no photo on laptop
      if (video && video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, 1080, 1080);
      }
    }
  }, [canvasRef, videoRef, photoCanvasRef, userImg, staticFrameImg, CIRCLE_X, CIRCLE_Y, CIRCLE_RADIUS, mabaInfo]);

  // Re-render when photoState or userImg changes
  useEffect(() => {
    updatePhotoCanvas();
    renderComposite();
  }, [updatePhotoCanvas, renderComposite]);

  // Continuous animation loop for video playback (Listens directly to HTML5 video element)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animId;
    const loop = () => {
      if (!video.paused && !video.ended) {
        setCurrentTime(video.currentTime);
        renderComposite();
        animId = requestAnimationFrame(loop);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(loop);
    };

    const handlePauseOrEnd = () => {
      setIsPlaying(false);
      cancelAnimationFrame(animId);
      renderComposite();
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePauseOrEnd);
    video.addEventListener('ended', handlePauseOrEnd);
    video.addEventListener('seeked', renderComposite);

    if (!video.paused) {
      animId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(animId);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePauseOrEnd);
      video.removeEventListener('ended', handlePauseOrEnd);
      video.removeEventListener('seeked', renderComposite);
    };
  }, [videoRef, renderComposite]);

  // Video loaded metadata
  const handleVideoLoaded = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration || 15.0);
      video.currentTime = 11.0;
      setCurrentTime(11.0);
      renderComposite();
    }
  };

  // Play/Pause toggle
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => console.log('Playback error:', e));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Mute toggle
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Timeline scrub
  const handleTimelineChange = (e) => {
    const t = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.currentTime = t;
    }
    setCurrentTime(t);
    renderComposite();
  };

  // Jump to specific time
  const jumpTo = (time) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
    }
    setCurrentTime(time);
    renderComposite();
  };

  // TOUCH & MOUSE GESTURES FOR MOBILE PINCH-TO-ZOOM & PAN
  const handleMouseDown = (e) => {
    if (!userImg) return;
    dragRef.current.isDragging = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.initialPhotoX = photoState.x;
    dragRef.current.initialPhotoY = photoState.y;
  };

  const handleMouseMove = (e) => {
    if (!dragRef.current.isDragging) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scaleFactor = 1080 / rect.width;

    const dx = (e.clientX - dragRef.current.startX) * scaleFactor;
    const dy = (e.clientY - dragRef.current.startY) * scaleFactor;

    setPhotoState((prev) => ({
      ...prev,
      x: dragRef.current.initialPhotoX + dx,
      y: dragRef.current.initialPhotoY + dy,
    }));
  };

  const handleMouseUp = () => {
    dragRef.current.isDragging = false;
  };

  const handleWheel = (e) => {
    if (!userImg) return;
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    setPhotoState((prev) => ({
      ...prev,
      scale: Math.max(0.1, Math.min(prev.scale * zoomFactor, prev.baseScale * 4)),
    }));
  };

  // Touch events (Mobile gestures)
  const handleTouchStart = (e) => {
    if (!userImg) return;
    if (e.touches.length === 1) {
      dragRef.current.isDragging = true;
      dragRef.current.startX = e.touches[0].clientX;
      dragRef.current.startY = e.touches[0].clientY;
      dragRef.current.initialPhotoX = photoState.x;
      dragRef.current.initialPhotoY = photoState.y;
    } else if (e.touches.length === 2) {
      dragRef.current.isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      dragRef.current.initialPinchDistance = Math.hypot(dx, dy);
      dragRef.current.initialScale = photoState.scale;
    }
  };

  const handleTouchMove = (e) => {
    if (!userImg) return;
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scaleFactor = 1080 / rect.width;

    if (e.touches.length === 1 && dragRef.current.isDragging) {
      const dx = (e.touches[0].clientX - dragRef.current.startX) * scaleFactor;
      const dy = (e.touches[0].clientY - dragRef.current.startY) * scaleFactor;
      setPhotoState((prev) => ({
        ...prev,
        x: dragRef.current.initialPhotoX + dx,
        y: dragRef.current.initialPhotoY + dy,
      }));
    } else if (e.touches.length === 2 && dragRef.current.initialPinchDistance > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDistance = Math.hypot(dx, dy);
      const ratio = currentDistance / dragRef.current.initialPinchDistance;

      setPhotoState((prev) => ({
        ...prev,
        scale: Math.max(0.1, Math.min(dragRef.current.initialScale * ratio, prev.baseScale * 4)),
      }));
    }
  };

  const handleTouchEnd = () => {
    dragRef.current.isDragging = false;
    dragRef.current.initialPinchDistance = 0;
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Hidden elements */}
      <video
        ref={videoRef}
        src={resolveAssetUrl(config.template_video, 'videos/template.mp4')}
        playsInline
        muted={isMuted}
        crossOrigin="anonymous"
        onLoadedMetadata={handleVideoLoaded}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
      <canvas ref={photoCanvasRef} width={1080} height={1080} className="hidden" />

      {/* Main Preview Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full max-w-[360px] xs:max-w-[400px] sm:max-w-[440px] lg:max-w-[460px] aspect-square rounded-2xl overflow-hidden bg-[#12141c] border-2 border-[#2b3040] shadow-2xl shadow-red-950/20 touch-none cursor-grab active:cursor-grabbing select-none"
      >
        <canvas
          ref={canvasRef}
          width={1080}
          height={1080}
          className="w-full h-full object-contain block"
        />

        {/* Empty State Overlay */}
        {!userImg && (
          <div
            onClick={onPickPhoto}
            className="absolute inset-0 bg-[#0c0d12]/85 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 sm:p-6 text-center cursor-pointer transition hover:bg-[#0c0d12]/75"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center mb-3 sm:mb-4 ring-8 ring-red-600/10 animate-pulse">
              <ImagePlus className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white font-display mb-1">
              Belum Ada Foto Terpasang
            </h3>
            <p className="text-[11px] sm:text-xs text-gray-400 max-w-xs mb-3 sm:mb-4 px-2">
              Ketuk di sini atau tombol upload di bawah untuk memasang foto Anda ke dalam twibbon!
            </p>
            <span className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-red-600 text-white font-semibold text-xs shadow-lg shadow-red-600/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Pilih Foto Sekarang
            </span>
          </div>
        )}

        {/* Drag & Pinch hint badge */}
        {userImg && (
          <div className="absolute top-2.5 left-2.5 pointer-events-none px-2 sm:px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] sm:text-[11px] font-medium text-gray-300 border border-white/10 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            Geser & Cubit untuk atur foto
          </div>
        )}
      </div>

      {/* Video Playback Bar */}
      <div className="w-full max-w-[360px] xs:max-w-[400px] sm:max-w-[440px] lg:max-w-[460px] mt-2.5 sm:mt-3 bg-[#161922] border border-[#2b3040] rounded-xl p-2.5 sm:p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={togglePlay}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition shrink-0 shadow-md shadow-red-600/20 active:scale-95"
            title={isPlaying ? 'Pause Preview' : 'Play Preview'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white ml-0.5" />}
          </button>

          <input
            type="range"
            min="0"
            max={duration || 15}
            step="0.05"
            value={currentTime}
            onChange={handleTimelineChange}
            className="flex-1 h-1.5 sm:h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
          />

          <span className="text-[10px] sm:text-[11px] font-mono text-gray-400 shrink-0 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <button
            onClick={toggleMute}
            className="p-1 sm:p-1.5 text-gray-400 hover:text-white rounded-lg transition shrink-0"
            title={isMuted ? 'Nyalakan Audio' : 'Bisukan Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Jump Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pt-0.5 -mx-0.5 px-0.5 touch-pan-x">
          <span className="text-[10px] text-gray-400 font-medium shrink-0 mr-0.5">Loncat:</span>
          <button
            onClick={() => jumpTo(11.0)}
            className={`px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-semibold border transition shrink-0 inline-flex items-center gap-1 ${
              Math.abs(currentTime - 11.0) < 0.5
                ? 'bg-red-950 text-red-300 border-red-700'
                : 'bg-[#1f2330] text-gray-300 border-gray-700 hover:bg-gray-700'
            }`}
          >
            <Crosshair className="w-3 h-3 text-red-400 shrink-0" />
            <span>11s (Frame Twibbon)</span>
          </button>
          <button
            onClick={() => jumpTo(1.5)}
            className={`px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-semibold border transition shrink-0 inline-flex items-center gap-1 ${
              Math.abs(currentTime - 1.5) < 0.5
                ? 'bg-red-950 text-red-300 border-red-700'
                : 'bg-[#1f2330] text-gray-300 border-gray-700 hover:bg-gray-700'
            }`}
          >
            <Laptop className="w-3 h-3 text-blue-400 shrink-0" />
            <span>1.5s (Intro Laptop)</span>
          </button>
          <button
            onClick={() => jumpTo(7.0)}
            className={`px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-semibold border transition shrink-0 inline-flex items-center gap-1 ${
              Math.abs(currentTime - 7.0) < 0.5
                ? 'bg-red-950 text-red-300 border-red-700'
                : 'bg-[#1f2330] text-gray-300 border-gray-700 hover:bg-gray-700'
            }`}
          >
            <Film className="w-3 h-3 text-amber-400 shrink-0" />
            <span>7s (Judul)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
