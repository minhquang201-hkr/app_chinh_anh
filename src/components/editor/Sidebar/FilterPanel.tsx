'use client';

import React from 'react';
import { useEditorStore } from '../../../stores/useEditorStore';
import type { FilterPreset } from '../../../types/editor';

interface PresetItem {
  id: FilterPreset;
  label: string;
  gradient: string;
}

const PRESETS: PresetItem[] = [
  { id: 'normal', label: 'Gốc (Normal)', gradient: 'from-zinc-700 to-zinc-800' },
  { id: 'vintage', label: 'Vintage', gradient: 'from-amber-700/80 to-stone-900' },
  { id: 'sepia', label: 'Sepia', gradient: 'from-yellow-800/80 to-amber-950' },
  { id: 'grayscale', label: 'Đen Trắng (Gray)', gradient: 'from-zinc-500 to-zinc-950' },
  { id: 'blackwhite', label: 'Tương Phản Cao', gradient: 'from-white to-black' },
  { id: 'warm', label: 'Tone Ấm', gradient: 'from-orange-500/80 to-amber-900' },
  { id: 'cool', label: 'Tone Lạnh', gradient: 'from-cyan-600/80 to-blue-950' },
];

export const FilterPanel: React.FC = () => {
  const { activeFilterPreset, setActiveFilterPreset, hasImage } = useEditorStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-200">Bộ Lọc Màu Nghệ Thuật</h3>
        <span className="text-xs text-zinc-400">7 Mẫu</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {PRESETS.map((preset) => {
          const isSelected = activeFilterPreset === preset.id;

          return (
            <button
              key={preset.id}
              disabled={!hasImage}
              onClick={() => setActiveFilterPreset(preset.id)}
              className={`relative overflow-hidden rounded-xl p-3 text-left transition-all border ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-500/10'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800/60'
              } disabled:opacity-50 disabled:cursor-not-allowed group`}
            >
              {/* Preview Gradient Thumbnail */}
              <div
                className={`w-full h-14 rounded-lg mb-2.5 bg-gradient-to-br ${preset.gradient} flex items-center justify-center shadow-inner group-hover:scale-[1.02] transition-transform`}
              >
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              <span className={`text-xs font-medium block truncate ${
                isSelected ? 'text-indigo-300' : 'text-zinc-300'
              }`}>
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
