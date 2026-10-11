import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Smartphone, Share2 } from 'lucide-react';

export default function ShareModal({ isOpen, onClose, onCopyLink }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  useEffect(() => {
    if (isOpen && currentUrl) {
      QRCode.toDataURL(currentUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl).then(() => {
      setCopied(true);
      if (onCopyLink) onCopyLink();
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Twibbon Adhigana Informatika 2026',
          text: 'Buat Video & Foto Twibbon resmi kamu sekarang secara instan!',
          url: currentUrl,
        });
      } catch (_) {}
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161922] border border-[#2b3040] rounded-2xl max-w-sm w-full p-4 sm:p-6 text-center shadow-2xl relative max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-gray-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center mx-auto mb-2 sm:mb-3">
          <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-white font-display mb-1">Bagikan Twibbon</h3>
        <p className="text-[11px] sm:text-xs text-gray-400 mb-3 sm:mb-4">
          Buka di smartphone atau bagikan tautan ini ke teman-teman seangkatan!
        </p>

        {/* QR Code Container */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl inline-block shadow-inner mb-3 sm:mb-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code Link" className="w-40 h-40 sm:w-48 sm:h-48 mx-auto rounded" />
          ) : (
            <div className="w-40 h-40 sm:w-48 sm:h-48 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
              Membuat QR Code...
            </div>
          )}
        </div>

        {/* Native Mobile Share Button (if supported) */}
        {canNativeShare && (
          <button
            onClick={handleNativeShare}
            className="w-full mb-2.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition active:scale-98"
          >
            <Share2 className="w-4 h-4" />
            <span>Bagikan ke WhatsApp / Media Sosial</span>
          </button>
        )}

        <div className="flex items-center gap-2 bg-[#0d0f15] p-1.5 sm:p-2 rounded-xl border border-gray-800">
          <input
            type="text"
            readOnly
            value={currentUrl}
            className="bg-transparent text-[11px] sm:text-xs text-gray-300 flex-1 px-2 outline-none truncate"
          />
          <button
            onClick={handleCopy}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#1f2330] hover:bg-[#2b3042] text-gray-200 border border-gray-700 text-xs font-semibold flex items-center gap-1 transition shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin' : 'Salin'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
