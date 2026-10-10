import React from 'react';
import { Play, QrCode, HelpCircle } from 'lucide-react';

export default function Navbar({ config, onOpenShare, onOpenGuide }) {
  return (
    <header className="border-b border-[#232733] bg-[#12141c]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-400 flex items-center justify-center shadow-lg shadow-red-500/20 text-white font-bold text-lg font-display">
            <Play className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
              {config.campaign_title || 'ADHIGANA INFORMATIKA 2026'}
              <span className="text-[10px] bg-red-950 text-red-400 border border-red-800/60 font-semibold px-2 py-0.5 rounded-full">
                RESMI
              </span>
            </h1>
            <p className="text-xs text-gray-400 font-medium">
              {config.campaign_subtitle || 'Fakultas Sains dan Teknologi'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenShare}
            className="px-3 py-1.5 rounded-lg bg-[#1f2330] hover:bg-[#2b3042] text-xs font-semibold text-gray-200 border border-gray-700/60 flex items-center gap-1.5 transition active:scale-95"
            title="Scan QR Code untuk buka di HP"
          >
            <QrCode className="w-4 h-4 text-red-400" />
            <span className="hidden sm:inline">Buka di HP</span>
          </button>
          
          <button
            onClick={onOpenGuide}
            className="px-3 py-1.5 rounded-lg bg-[#1f2330] hover:bg-[#2b3042] text-xs font-semibold text-gray-200 border border-gray-700/60 flex items-center gap-1.5 transition active:scale-95"
            title="Petunjuk Penggunaan"
          >
            <HelpCircle className="w-4 h-4 text-gray-400" />
            <span className="hidden sm:inline">Petunjuk</span>
          </button>
        </div>
      </div>
    </header>
  );
}
