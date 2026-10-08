'use client';

import React, { useState } from 'react';
import { useEditorStore } from '../../../stores/useEditorStore';

export const EraserPanel: React.FC = () => {
  const [mode, setMode] = useState<'click' | 'brush' | 'erase'>('click');
  const [brushSize, setBrushSize] = useState(28);
  const { hasImage, isProcessing, setIsProcessing } = useEditorStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-200">Xoá Vật Thể AI</h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm">
            AI Magic
          </span>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
        <button
          onClick={() => setMode('click')}
          disabled={!hasImage}
          className={`flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-medium transition-all ${
            mode === 'click'
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <span>Click chọn</span>
        </button>

        <button
          onClick={() => setMode('brush')}
          disabled={!hasImage}
          className={`flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-medium transition-all ${
            mode === 'brush'
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span>Cọ quét</span>
        </button>

        <button
          onClick={() => setMode('erase')}
          disabled={!hasImage}
          className={`flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-medium transition-all ${
            mode === 'erase'
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Tẩy mask</span>
        </button>
      </div>

      {/* Brush Size Slider */}
      {mode !== 'click' && (
        <div className="space-y-1.5 p-3 rounded-xl bg-zinc-800/40 border border-zinc-800/80">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Kích thước cọ:</span>
            <span className="text-purple-300 font-mono font-semibold">{brushSize}px</span>
          </div>
          <input
            type="range"
            min={6}
            max={90}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <button
          disabled={!hasImage || isProcessing}
          onClick={() => {
            setIsProcessing(true);
            setTimeout(() => {
              setIsProcessing(false);
            }, 1200);
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <span>✨ Xoá Vật Thể & Tự Động Lấp Nền</span>
        </button>

        <p className="text-[11px] text-zinc-400 leading-relaxed">
          💡 <b>Click trực tiếp</b> vào vật thể trên ảnh hoặc <b>quét cọ</b> để khoanh vùng, sau đó bấm <b>Xoá Ngay</b> để AI tự động phục hồi nền.
        </p>
      </div>
    </div>
  );
};
