import React from 'react';
import { Loader2 } from 'lucide-react';

export default function RenderModal({ isOpen, progress, statusText }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#161922] border border-[#2b3040] rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-white font-display mb-1">
          Membuat Video Twibbon
        </h3>
        <p className="text-xs text-gray-400 mb-5">
          {statusText || 'Sedang memproses video dan audio 1080p...'}
        </p>

        {/* Progress bar */}
        <div className="w-full bg-[#0d0f15] rounded-full h-2.5 overflow-hidden border border-gray-800 mb-2">
          <div
            className="bg-gradient-to-r from-red-600 to-rose-400 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
          ></div>
        </div>

        <div className="flex justify-between items-center text-[11px] text-gray-400 font-medium">
          <span>Proses rendering</span>
          <span>{Math.round(progress)}%</span>
        </div>

        <p className="text-[10px] text-gray-400 mt-4 italic">
          Mohon jangan tutup halaman ini sampai proses download selesai.
        </p>
      </div>
    </div>
  );
}
