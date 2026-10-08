'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useEditorStore } from '../../stores/useEditorStore';

interface DropzoneProps {
  onImageLoaded: (dataUrl: string) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onImageLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setImage } = useEditorStore();

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn một file ảnh hợp lệ (JPG, PNG, WEBP...)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      
      const img = new Image();
      img.onload = () => {
        const formatSize = (bytes: number) => {
          if (bytes < 1024) return bytes + ' B';
          if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
          return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        };

        setImage(dataUrl, {
          name: file.name,
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight,
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileSize: formatSize(file.size),
          fileType: file.type,
        });

        onImageLoaded(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [setImage, onImageLoaded]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
      className={`relative w-full max-w-2xl h-96 rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 cursor-pointer group ${
        isDragging
          ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
          : 'border-zinc-700 hover:border-indigo-400/60 bg-zinc-900/50 hover:bg-zinc-800/50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
          }
        }}
      />

      <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-transform duration-300">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      <h3 className="text-xl font-semibold text-zinc-100 mb-2">
        Kéo & thả hình ảnh vào đây
      </h3>
      <p className="text-sm text-zinc-400 mb-6 text-center">
        hoặc nhấn để duyệt file từ máy tính của bạn
      </p>

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-xs text-zinc-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        Hỗ trợ JPG, PNG, WEBP, BMP
      </div>
    </div>
  );
};
