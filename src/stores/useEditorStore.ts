import { create } from 'zustand';
import type { ToolType, FilterPreset, ImageAdjustments, ImageMetadata } from '../types/editor';

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  sharpness: 0,
  saturation: 0,
  vibrance: 0,
  blur: 0,
  exposure: 0,
  temperature: 0,
};

interface EditorState {
  // Canvas & Media State
  hasImage: boolean;
  imageSrc: string | null;
  imageMetadata: ImageMetadata | null;
  isProcessing: boolean;
  
  // Tool & Navigation
  activeTool: ToolType;
  zoomLevel: number;
  
  // Image Editing Values
  adjustments: ImageAdjustments;
  activeFilterPreset: FilterPreset;
  
  // Selection & History State
  selectedObjectId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  
  // Actions
  setImage: (src: string, metadata: ImageMetadata) => void;
  clearImage: () => void;
  setActiveTool: (tool: ToolType) => void;
  setZoomLevel: (zoom: number) => void;
  setAdjustment: <K extends keyof ImageAdjustments>(key: K, value: ImageAdjustments[K]) => void;
  setAdjustments: (adjustments: Partial<ImageAdjustments>) => void;
  resetAdjustments: () => void;
  setActiveFilterPreset: (preset: FilterPreset) => void;
  setIsProcessing: (processing: boolean) => void;
  setSelectedObjectId: (id: string | null) => void;
  setHistoryStatus: (canUndo: boolean, canRedo: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  hasImage: false,
  imageSrc: null,
  imageMetadata: null,
  isProcessing: false,
  
  activeTool: 'adjust',
  zoomLevel: 1,
  
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  activeFilterPreset: 'normal',
  
  selectedObjectId: null,
  canUndo: false,
  canRedo: false,
  
  setImage: (src, metadata) => set({
    hasImage: true,
    imageSrc: src,
    imageMetadata: metadata,
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    activeFilterPreset: 'normal',
    zoomLevel: 1,
  }),
  
  clearImage: () => set({
    hasImage: false,
    imageSrc: null,
    imageMetadata: null,
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    activeFilterPreset: 'normal',
    selectedObjectId: null,
    canUndo: false,
    canRedo: false,
  }),
  
  setActiveTool: (tool) => set({ activeTool: tool }),
  setZoomLevel: (zoom) => set({ zoomLevel: zoom }),
  
  setAdjustment: (key, value) => set((state) => ({
    adjustments: {
      ...state.adjustments,
      [key]: value,
    },
  })),
  
  setAdjustments: (newAdjustments) => set((state) => ({
    adjustments: {
      ...state.adjustments,
      ...newAdjustments,
    },
  })),
  
  resetAdjustments: () => set({
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    activeFilterPreset: 'normal',
  }),
  
  setActiveFilterPreset: (preset) => set({ activeFilterPreset: preset }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setSelectedObjectId: (selectedObjectId) => set({ selectedObjectId }),
  setHistoryStatus: (canUndo, canRedo) => set({ canUndo, canRedo }),
}));
