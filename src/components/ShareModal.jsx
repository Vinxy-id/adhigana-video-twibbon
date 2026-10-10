import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Smartphone } from 'lucide-react';

export default function ShareModal({ isOpen, onClose, onCopyLink }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161922] border border-[#2b3040] rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center mx-auto mb-3">
          <Smartphone className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-white font-display mb-1">Buka di Smartphone</h3>
        <p className="text-xs text-gray-400 mb-4">
          Arahkan kamera HP Anda ke QR Code di bawah untuk langsung membuka web ini tanpa ribet!
        </p>

        <div className="bg-white p-3 rounded-xl inline-block shadow-inner mb-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code Link" className="w-48 h-48 mx-auto rounded" />
          ) : (
            <div className="w-48 h-48 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
              Membuat QR Code...
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 bg-[#0d0f15] p-2 rounded-xl border border-gray-800">
          <input
            type="text"
            readOnly
            value={currentUrl}
            className="bg-transparent text-xs text-gray-300 flex-1 px-2 outline-none truncate"
          />
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin' : 'Salin'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
