export type ToolType = 
  | 'select' 
  | 'adjust' 
  | 'filter' 
  | 'crop' 
  | 'rotate' 
  | 'text' 
  | 'draw' 
  | 'shapes';

export type FilterPreset = 
  | 'normal' 
  | 'vintage' 
  | 'sepia' 
  | 'grayscale' 
  | 'blackwhite' 
  | 'warm' 
  | 'cool' 
  | 'dramatic' 
  | 'cinema';

export interface ImageAdjustments {
  brightness: number;  // -100 to 100 (Default: 0)
  contrast: number;    // -100 to 100 (Default: 0)
  sharpness: number;   // 0 to 100 (Default: 0)
  saturation: number;  // -100 to 100 (Default: 0)
  vibrance: number;    // -100 to 100 (Default: 0)
  blur: number;        // 0 to 100 (Default: 0)
  exposure: number;    // -100 to 100 (Default: 0)
  temperature: number; // -100 to 100 (Default: 0)
}

export interface ImageMetadata {
  name: string;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  fileSize: string;
  fileType: string;
}

export interface CanvasHistoryState {
  json: string;
  thumbnail?: string;
  timestamp: number;
}
