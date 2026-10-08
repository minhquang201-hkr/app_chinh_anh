'use client';

import React from 'react';
import { useEditorStore } from '../../../stores/useEditorStore';
import type { ImageAdjustments } from '../../../types/editor';

interface SliderItemProps {
  id: keyof ImageAdjustments;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  icon: React.ReactNode;
  onChange: (value: number) => void;
  onReset: () => void;
}

const SliderItem: React.FC<SliderItemProps> = ({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  icon,
  onChange,
  onReset,
}) => {
  const isDefault = value === 0;

  return (
    <div className="space-y-2 p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-800/80 transition-all">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-zinc-300 font-medium">
          <span className="text-zinc-400">{icon}</span>
          <label htmlFor={id}>{label}</label>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded font-mono text-xs ${
            !isDefault ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'bg-zinc-800 text-zinc-400'
          }`}>
            {value > 0 && id !== 'blur' && id !== 'sharpness' ? `+${value}` : value}
            {unit}
          </span>
          {!isDefault && (
            <button
              onClick={onReset}
              title="Đặt lại thông số này"
              className="p-1 hover:text-rose-400 text-zinc-500 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="relative flex items-center">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
        />
      </div>
    </div>
  );
};

export const AdjustPanel: React.FC = () => {
  const { adjustments, setAdjustment, resetAdjustments, hasImage } = useEditorStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-200">Thông Số Cơ Bản</h3>
        <button
          onClick={resetAdjustments}
          disabled={!hasImage}
          className="text-xs text-indigo-400 hover:text-indigo-300 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors"
        >
          Đặt lại tất cả
        </button>
      </div>

      <div className="space-y-2.5">
        {/* Brightness */}
        <SliderItem
          id="brightness"
          label="Độ sáng"
          value={adjustments.brightness}
          min={-100}
          max={100}
          icon={
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          onChange={(v) => setAdjustment('brightness', v)}
          onReset={() => setAdjustment('brightness', 0)}
        />

        {/* Contrast */}
        <SliderItem
          id="contrast"
          label="Độ tương phản"
          value={adjustments.contrast}
          min={-100}
          max={100}
          icon={
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          }
          onChange={(v) => setAdjustment('contrast', v)}
          onReset={() => setAdjustment('contrast', 0)}
        />

        {/* Sharpness */}
        <SliderItem
          id="sharpness"
          label="Độ nét"
          value={adjustments.sharpness}
          min={0}
          max={100}
          icon={
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          onChange={(v) => setAdjustment('sharpness', v)}
          onReset={() => setAdjustment('sharpness', 0)}
        />

        {/* Saturation */}
        <SliderItem
          id="saturation"
          label="Độ bão hòa"
          value={adjustments.saturation}
          min={-100}
          max={100}
          icon={
            <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4 5 5 0 012-4.2V7a2 2 0 012-2h4a2 2 0 012 2v5.8a5 5 0 012 4.2 4 4 0 01-4 4H7z" />
            </svg>
          }
          onChange={(v) => setAdjustment('saturation', v)}
          onReset={() => setAdjustment('saturation', 0)}
        />

        {/* Blur */}
        <SliderItem
          id="blur"
          label="Làm mờ"
          value={adjustments.blur}
          min={0}
          max={100}
          icon={
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
          onChange={(v) => setAdjustment('blur', v)}
          onReset={() => setAdjustment('blur', 0)}
        />
      </div>
    </div>
  );
};
