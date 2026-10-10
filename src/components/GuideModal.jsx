import React from 'react';
import { X, Image, Move, Download, Share2, BookOpen } from 'lucide-react';

export default function GuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161922] border border-[#2b3040] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white font-display mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-red-400" />
          <span>Petunjuk untuk Mahasiswa Baru</span>
        </h3>

        <div className="space-y-3 text-xs sm:text-sm text-gray-300">
          <div className="flex gap-3 bg-[#0f1118] p-3 rounded-xl border border-gray-800">
            <div className="w-8 h-8 rounded-lg bg-red-950 text-red-400 flex items-center justify-center shrink-0">
              <Image className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-white">1. Pilih Foto Terbaik</p>
              <p className="text-gray-400 text-xs">Upload foto formal dari galeri HP atau ambil selfie langsung dengan kamera.</p>
            </div>
          </div>

          <div className="flex gap-3 bg-[#0f1118] p-3 rounded-xl border border-gray-800">
            <div className="w-8 h-8 rounded-lg bg-blue-950 text-blue-400 flex items-center justify-center shrink-0">
              <Move className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-white">2. Pas-kan dengan Bingkai</p>
              <p className="text-gray-400 text-xs">Geser foto dengan jari Anda atau cubit layar (*pinch-zoom*) untuk memperbesar/memperkecil agar wajah pas di dalam lingkaran.</p>
            </div>
          </div>

          <div className="flex gap-3 bg-[#0f1118] p-3 rounded-xl border border-gray-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-white">3. Download Foto / Video</p>
              <p className="text-gray-400 text-xs">Klik <b>Download Foto (PNG)</b> untuk foto profil IG/WA, atau <b>Download Video (MP4)</b> untuk video animasi Reels/TikTok.</p>
            </div>
          </div>

          <div className="flex gap-3 bg-[#0f1118] p-3 rounded-xl border border-gray-800">
            <div className="w-8 h-8 rounded-lg bg-purple-950 text-purple-400 flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-white">4. Salin Caption Resmi</p>
              <p className="text-gray-400 text-xs">Klik tombol <b>Salin Caption</b> di bawah untuk menyalin format caption ospek lengkap dengan tagar resmi.</p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 font-semibold text-white text-xs sm:text-sm transition shadow-lg shadow-red-600/20"
        >
          Saya Mengerti, Mulai Buat!
        </button>
      </div>
    </div>
  );
}
