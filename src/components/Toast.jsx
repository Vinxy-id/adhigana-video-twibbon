import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isError = toast.type === 'error';
  const isSuccess = toast.type === 'success' || !toast.type;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#181b26]/95 border border-gray-700/80 shadow-2xl backdrop-blur-md text-sm text-gray-100 max-w-sm sm:max-w-md w-auto animate-bounce-short">
      {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
      {isError && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
      {!isSuccess && !isError && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
      <span className="font-medium text-xs sm:text-sm">{toast.message}</span>
    </div>
  );
}
