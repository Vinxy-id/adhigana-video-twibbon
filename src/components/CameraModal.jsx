import React, { useRef, useState, useEffect } from 'react';
import { X, Camera, RefreshCw } from 'lucide-react';

export default function CameraModal({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (selfie) or 'environment'
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (mode) => {
    stopCamera();
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Gagal mengakses kamera. Pastikan izin kamera telah diizinkan.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');

    // If selfie mode, flip horizontally for mirror preview
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    onCapture(dataUrl);
    stopCamera();
    onClose();
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161922] border border-[#2b3040] rounded-2xl max-w-sm w-full p-5 text-center shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-white font-display mb-3 flex items-center justify-center gap-2">
          <Camera className="w-4 h-4 text-red-400" />
          Ambil Foto Selfie
        </h3>

        {cameraError ? (
          <div className="bg-red-950/40 border border-red-800 text-red-300 text-xs p-4 rounded-xl mb-4">
            {cameraError}
          </div>
        ) : (
          <div className="relative aspect-square w-full bg-black rounded-xl overflow-hidden mb-4 border border-gray-800">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
            />
            {/* Circle guide overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-3/4 h-3/4 rounded-full border-2 border-dashed border-red-500/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={toggleFacingMode}
            className="p-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs transition flex items-center gap-1.5"
            title="Putar Kamera Depan/Belakang"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleCapture}
            disabled={!!cameraError}
            className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-gray-800 text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
          >
            <Camera className="w-4 h-4" />
            Ambil Foto Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
