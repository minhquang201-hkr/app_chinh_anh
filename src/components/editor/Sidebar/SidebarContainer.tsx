'use client';

import React from 'react';
import { useEditorStore } from '../../../stores/useEditorStore';
import { AdjustPanel } from './AdjustPanel';
import { FilterPanel } from './FilterPanel';
import { EraserPanel } from './EraserPanel';
import type { ToolType } from '../../../types/editor';

interface TabItem {
  id: ToolType | 'eraser';
  label: string;
  icon: React.ReactNode;
}

const TABS: TabItem[] = [
  {
    id: 'adjust',
    label: 'Tinh chỉnh',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    id: 'filter',
    label: 'Bộ lọc',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    id: 'draw',
    label: 'Xóa AI',
    icon: (
      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
];

export const SidebarContainer: React.FC = () => {
  const { activeTool, setActiveTool } = useEditorStore();

  return (
    <aside className="w-80 h-full bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0">
      {/* Tab Navigation */}
      <div className="flex border-b border-zinc-800 bg-zinc-950/40 p-1.5 gap-1">
        {TABS.map((tab) => {
          const isActive = activeTool === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTool(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-zinc-800 text-indigo-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTool === 'adjust' && <AdjustPanel />}
        {activeTool === 'filter' && <FilterPanel />}
        {activeTool === 'draw' && <EraserPanel />}
      </div>
    </aside>
  );
};
