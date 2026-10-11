import React from 'react';
import { Play, QrCode, HelpCircle } from 'lucide-react';

export default function Navbar({ config, onOpenShare, onOpenGuide }) {
  return (
    <header className="border-b border-[#232733] bg-[#12141c]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-400 flex items-center justify-center shadow-lg shadow-red-500/20 text-white font-bold text-sm sm:text-lg font-display shrink-0">
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-xs sm:text-sm md:text-base font-bold text-white tracking-wide truncate max-w-[170px] xs:max-w-[220px] sm:max-w-none">
                {config.campaign_title || 'ADHIGANA INFORMATIKA 2026'}
              </h1>
              <span className="text-[9px] sm:text-[10px] bg-red-950 text-red-400 border border-red-800/60 font-semibold px-1.5 py-0.5 rounded-full shrink-0">
                RESMI
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-400 font-medium truncate max-w-[190px] xs:max-w-[240px] sm:max-w-none">
              {config.campaign_subtitle || 'Fakultas Sains dan Teknologi'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onOpenShare}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#1f2330] hover:bg-[#2b3042] text-xs font-semibold text-gray-200 border border-gray-700/60 flex items-center gap-1.5 transition active:scale-95"
            title="Scan QR Code / Bagikan Link"
          >
            <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400 shrink-0" />
            <span className="hidden sm:inline">Bagikan</span>
          </button>
          
          <button
            onClick={onOpenGuide}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#1f2330] hover:bg-[#2b3042] text-xs font-semibold text-gray-200 border border-gray-700/60 flex items-center gap-1.5 transition active:scale-95"
            title="Petunjuk Penggunaan"
          >
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 shrink-0" />
            <span className="hidden sm:inline">Petunjuk</span>
          </button>
        </div>
      </div>
    </header>
  );
}
