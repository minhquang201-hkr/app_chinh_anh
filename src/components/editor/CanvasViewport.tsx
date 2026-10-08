'use client';

import React, { useRef } from 'react';
import { useFabric } from '../../hooks/useFabric';
import { useEditorStore } from '../../stores/useEditorStore';
import { Dropzone } from './Dropzone';
import { HeaderNav } from './HeaderNav';
import { SidebarContainer } from './Sidebar/SidebarContainer';

export const CanvasViewport: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { canvasRef, loadImage, exportImage, undo, redo, resetZoom } = useFabric({ containerRef });
  const { hasImage, imageMetadata, isProcessing, zoomLevel } = useEditorStore();

  const handleExport = () => {
    const dataUrl = exportImage('png', 0.95);
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = `lumina_${imageMetadata?.name || 'edited_image.png'}`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden">
      {/* Top Navigation */}
      <HeaderNav
        onUndo={undo}
        onRedo={redo}
        onExport={handleExport}
        onImageSelected={(url) => loadImage(url)}
      />

      {/* Main Workspace Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Central Viewport */}
        <main
          ref={containerRef}
          className="relative flex-1 bg-zinc-950 flex items-center justify-center overflow-hidden p-6"
        >
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          {/* Show Dropzone when no image is loaded */}
          {!hasImage ? (
            <div className="z-10 animate-fade-in">
              <Dropzone onImageLoaded={(url) => loadImage(url)} />
            </div>
          ) : (
            <div className="relative z-10 shadow-2xl rounded-lg overflow-hidden border border-zinc-800/80">
              <canvas ref={canvasRef} />

              {/* Floating Bottom Meta Badge */}
              {imageMetadata && (
                <div className="absolute bottom-4 left-4 bg-zinc-900/85 backdrop-blur-md border border-zinc-800/80 px-3.5 py-1.5 rounded-full flex items-center gap-2.5 text-xs text-zinc-300 shadow-lg pointer-events-none">
                  <span className="font-mono">{imageMetadata.originalWidth} × {imageMetadata.originalHeight} px</span>
                  <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                  <span className="text-zinc-400">{imageMetadata.fileSize}</span>
                  <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                  <span className="text-indigo-400 font-medium">{Math.round(zoomLevel * 100)}%</span>
                </div>
              )}

              {/* Floating Zoom Reset Button */}
              {Math.abs(zoomLevel - 1) > 0.05 && (
                <button
                  onClick={resetZoom}
                  title="Đặt lại mức thu phóng (Fit)"
                  className="absolute bottom-4 right-4 bg-zinc-900/85 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-full text-xs text-zinc-300 shadow-lg transition-all"
                >
                  Fit 100%
                </button>
              )}
            </div>
          )}

          {/* Processing Loading Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-zinc-200">Đang xử lý pixel...</span>
            </div>
          )}
        </main>

        {/* Sidebar Tools Panel */}
        <SidebarContainer />
      </div>
    </div>
  );
};
