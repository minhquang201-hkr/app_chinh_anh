'use client';

import React, { useRef } from 'react';
import { useEditorStore } from '../../stores/useEditorStore';

interface HeaderNavProps {
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onImageSelected: (dataUrl: string) => void;
  onOpenHistory?: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  onUndo,
  onRedo,
  onExport,
  onImageSelected,
  onOpenHistory,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { hasImage, canUndo, canRedo, resetAdjustments, setImage } = useEditorStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setImage(dataUrl, {
            name: file.name,
            originalWidth: img.naturalWidth,
            originalHeight: img.naturalHeight,
            width: img.naturalWidth,
            height: img.naturalHeight,
            fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
            fileType: file.type,
          });
          onImageSelected(dataUrl);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <header className="h-16 bg-zinc-900 border-b border-zinc-800 px-6 flex items-center justify-between shrink-0 select-none">
      {/* Brand / Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            LuminaEdit
          </h1>
          <p className="text-[11px] text-zinc-500">Fabric.js Pro Canvas Editor</p>
        </div>
      </div>

      {/* Center Actions: Undo / Redo / Reset */}
      <div className="flex items-center gap-1.5 bg-zinc-950/50 p-1 rounded-xl border border-zinc-800/80">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Hoàn tác (Ctrl+Z)"
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a5 5 0 015 5v2a5 5 0 01-5 5H6" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 6L3 10l4 4" />
          </svg>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Làm lại (Ctrl+Y)"
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10H11a5 5 0 00-5 5v2a5 5 0 005 5h7" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 6l4 4-4 4" />
          </svg>
        </button>

        <div className="w-px h-5 bg-zinc-800 mx-1"></div>

        <button
          onClick={resetAdjustments}
          disabled={!hasImage}
          title="Đặt lại thông số mặc định"
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
        >
          Đặt lại
        </button>
      </div>

      {/* Right Actions: Upload, History & Export */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/60 transition-all shadow-sm"
        >
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>Mở ảnh</span>
        </button>

        {onOpenHistory && (
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-zinc-700/60 transition-all"
          >
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Lịch sử</span>
          </button>
        )}

        <button
          onClick={onExport}
          disabled={!hasImage}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white shadow-lg shadow-indigo-600/20 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Tải ảnh về</span>
        </button>
      </div>
    </header>
  );
};
