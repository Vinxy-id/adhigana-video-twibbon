import React, { useRef } from 'react';
import {
  Upload,
  Camera,
  ZoomIn,
  RotateCw,
  Crosshair,
  Maximize2,
  RotateCcw,
  RefreshCw,
  Download,
  Film,
  Copy,
  Check,
  User,
} from 'lucide-react';

export default function ControlPanel({
  photoState,
  setPhotoState,
  onFileSelect,
  onOpenCamera,
  hasPhoto,
  onDownloadPhoto,
  onDownloadVideo,
  onCopyCaption,
  mabaInfo,
  setMabaInfo,
}) {
  const fileInputRef = useRef(null);

  const handleZoomChange = (e) => {
    const mult = parseFloat(e.target.value);
    setPhotoState((prev) => ({
      ...prev,
      scale: prev.baseScale * mult,
    }));
  };

  const handleRotateChange = (e) => {
    const rot = parseFloat(e.target.value);
    setPhotoState((prev) => ({
      ...prev,
      rotation: rot,
    }));
  };

  const centerPhoto = () => {
    setPhotoState((prev) => ({ ...prev, x: 0, y: 0 }));
  };

  const fitCircle = () => {
    setPhotoState((prev) => ({
      ...prev,
      x: 0,
      y: 0,
      scale: prev.baseScale,
    }));
  };

  const rotate90 = () => {
    setPhotoState((prev) => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
    }));
  };

  const resetTransform = () => {
    setPhotoState((prev) => ({
      ...prev,
      x: 0,
      y: 0,
      scale: prev.baseScale,
      rotation: 0,
    }));
  };

  const currentZoomRatio = photoState.baseScale > 0
    ? Math.round((photoState.scale / photoState.baseScale) * 100)
    : 100;

  return (
    <div className="w-full max-w-xl flex flex-col gap-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileSelect}
        className="hidden"
      />

      {/* 1. Upload & Camera Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition active:scale-98"
        >
          <Upload className="w-4 h-4" />
          <span>{hasPhoto ? 'Ganti Foto' : 'Pilih Foto Galeri'}</span>
        </button>

        <button
          onClick={onOpenCamera}
          className="py-3 px-4 rounded-xl bg-[#1f2330] hover:bg-[#2b3042] text-gray-200 border border-gray-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-98"
        >
          <Camera className="w-4 h-4 text-red-400" />
          <span>Foto Selfie</span>
        </button>
      </div>

      {/* 2. Photo Adjustment Sliders & Tools */}
      <div className="bg-[#161922] border border-[#2b3040] rounded-2xl p-4 flex flex-col gap-3">
        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-red-400" /> Atur Posisi & Ukuran Foto
        </h4>

        {/* Zoom Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <ZoomIn className="w-3.5 h-3.5" /> Perbesar (Zoom)
            </span>
            <span className="font-mono text-gray-300">{currentZoomRatio}%</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="3.0"
            step="0.02"
            disabled={!hasPhoto}
            value={photoState.baseScale > 0 ? photoState.scale / photoState.baseScale : 1}
            onChange={handleZoomChange}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-40"
          />
        </div>

        {/* Rotate Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <RotateCw className="w-3.5 h-3.5" /> Putar (Rotasi)
            </span>
            <span className="font-mono text-gray-300">{Math.round(photoState.rotation)}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            disabled={!hasPhoto}
            value={photoState.rotation}
            onChange={handleRotateChange}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-40"
          />
        </div>

        {/* Quick Transform Buttons */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <button
            onClick={centerPhoto}
            disabled={!hasPhoto}
            className="py-1.5 px-2 rounded-lg bg-[#1f2330] hover:bg-[#2b3042] text-[11px] font-medium text-gray-300 border border-gray-700 disabled:opacity-40 flex items-center justify-center gap-1 transition"
            title="Pusatkan Foto"
          >
            <Crosshair className="w-3 h-3 text-red-400" />
            <span>Tengah</span>
          </button>

          <button
            onClick={fitCircle}
            disabled={!hasPhoto}
            className="py-1.5 px-2 rounded-lg bg-[#1f2330] hover:bg-[#2b3042] text-[11px] font-medium text-gray-300 border border-gray-700 disabled:opacity-40 flex items-center justify-center gap-1 transition"
            title="Pas-kan dengan Lingkaran"
          >
            <Maximize2 className="w-3 h-3 text-blue-400" />
            <span>Pas Lingkar</span>
          </button>

          <button
            onClick={rotate90}
            disabled={!hasPhoto}
            className="py-1.5 px-2 rounded-lg bg-[#1f2330] hover:bg-[#2b3042] text-[11px] font-medium text-gray-300 border border-gray-700 disabled:opacity-40 flex items-center justify-center gap-1 transition"
            title="Putar 90 Derajat"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" />
            <span>+90°</span>
          </button>

          <button
            onClick={resetTransform}
            disabled={!hasPhoto}
            className="py-1.5 px-2 rounded-lg bg-[#1f2330] hover:bg-[#2b3042] text-[11px] font-medium text-gray-300 border border-gray-700 disabled:opacity-40 flex items-center justify-center gap-1 transition"
            title="Reset Pengaturan"
          >
            <RefreshCw className="w-3 h-3 text-gray-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 3. Identitas Maba (Nama & Gugus Otomatis di Twibbon) */}
      <div className="bg-[#161922] border border-[#2b3040] rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
            <User className="w-3.5 h-3.5 text-red-400" /> Tulis Nama di Twibbon (Opsional)
          </label>
          <input
            type="checkbox"
            checked={mabaInfo.showOnTwibbon}
            onChange={(e) => setMabaInfo((prev) => ({ ...prev, showOnTwibbon: e.target.checked }))}
            className="w-4 h-4 rounded text-red-600 bg-gray-800 border-gray-700 cursor-pointer accent-red-600"
          />
        </div>

        {mabaInfo.showOnTwibbon && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-fade-in">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Nama Lengkap</label>
              <input
                type="text"
                placeholder="Contoh: Budi Santoso"
                value={mabaInfo.name}
                onChange={(e) => setMabaInfo((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full bg-[#0d0f15] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-red-500 transition"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Kelompok / Gugus / NIM</label>
              <input
                type="text"
                placeholder="Contoh: Gugus 03 • Informatika"
                value={mabaInfo.groupOrNim}
                onChange={(e) => setMabaInfo((prev) => ({ ...prev, groupOrNim: e.target.value }))}
                className="w-full bg-[#0d0f15] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-red-500 transition"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Action Export Buttons (Foto, Video, Caption) */}
      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Download Foto PNG */}
          <button
            onClick={onDownloadFoto}
            className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>Download Foto (PNG HD)</span>
          </button>

          {/* Download Video MP4 */}
          <button
            onClick={onDownloadVideo}
            className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition active:scale-98"
          >
            <Film className="w-4 h-4" />
            <span>Download Video (MP4)</span>
          </button>
        </div>

        {/* Salin Caption Instagram */}
        <button
          onClick={onCopyCaption}
          className="w-full py-3 px-4 rounded-xl bg-[#1f2330] hover:bg-[#2b3042] text-gray-200 border border-gray-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-98"
        >
          <Copy className="w-4 h-4 text-purple-400" />
          <span>Salin Caption Instagram Resmi</span>
        </button>
      </div>
    </div>
  );

  function onDownloadFoto() {
    onDownloadPhoto();
  }
}
