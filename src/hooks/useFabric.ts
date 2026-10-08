import { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import { useEditorStore } from '../stores/useEditorStore';
import type { ImageAdjustments, FilterPreset } from '../types/editor';

interface UseFabricOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const useFabric = ({ containerRef }: UseFabricOptions) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const mainImageRef = useRef<fabric.FabricImage | null>(null);

  // Undo / Redo history stacks
  const historyStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const isHistoryLockedRef = useRef(false);

  const {
    adjustments,
    activeFilterPreset,
    setIsProcessing,
    setSelectedObjectId,
    setHistoryStatus,
    setZoomLevel,
  } = useEditorStore();

  /**
   * Save snapshot of canvas state for Undo/Redo
   */
  const saveHistorySnapshot = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isHistoryLockedRef.current) return;

    try {
      const json = JSON.stringify(canvas.toJSON());
      historyStackRef.current.push(json);
      redoStackRef.current = []; // Reset redo stack on new action
      
      setHistoryStatus(
        historyStackRef.current.length > 1,
        redoStackRef.current.length > 0
      );
    } catch (err) {
      console.error('Failed to save canvas history snapshot:', err);
    }
  }, [setHistoryStatus]);

  /**
   * Undo to previous state
   */
  const undo = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyStackRef.current.length <= 1) return;

    isHistoryLockedRef.current = true;
    const currentState = historyStackRef.current.pop();
    if (currentState) {
      redoStackRef.current.push(currentState);
    }

    const prevState = historyStackRef.current[historyStackRef.current.length - 1];
    canvas.loadFromJSON(JSON.parse(prevState)).then(() => {
      canvas.renderAll();
      isHistoryLockedRef.current = false;
      setHistoryStatus(
        historyStackRef.current.length > 1,
        redoStackRef.current.length > 0
      );
    });
  }, [setHistoryStatus]);

  /**
   * Redo to next state
   */
  const redo = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || redoStackRef.current.length === 0) return;

    isHistoryLockedRef.current = true;
    const nextState = redoStackRef.current.pop();
    if (nextState) {
      historyStackRef.current.push(nextState);
      canvas.loadFromJSON(JSON.parse(nextState)).then(() => {
        canvas.renderAll();
        isHistoryLockedRef.current = false;
        setHistoryStatus(
          historyStackRef.current.length > 1,
          redoStackRef.current.length > 0
        );
      });
    }
  }, [setHistoryStatus]);

  /**
   * Initialize Fabric Canvas & Events
   */
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#18181b', // Zinc 900
      preserveObjectStacking: true,
      selection: true,
    });

    fabricCanvasRef.current = canvas;

    // Zoom on mouse wheel
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 5) zoom = 5;
      if (zoom < 0.2) zoom = 0.2;

      const point = new fabric.Point(opt.e.offsetX, opt.e.offsetY);
      canvas.zoomToPoint(point, zoom);
      setZoomLevel(zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Object Selection Events
    canvas.on('selection:created', (e) => {
      const selected = e.selected?.[0];
      setSelectedObjectId(selected ? (selected.get('id') as string) || 'object' : null);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObjectId(null);
    });

    canvas.on('object:modified', () => {
      saveHistorySnapshot();
    });

    // Auto resize canvas when container changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        if (newWidth > 0 && newHeight > 0) {
          canvas.setDimensions({ width: newWidth, height: newHeight });
          canvas.renderAll();
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [containerRef, setSelectedObjectId, setZoomLevel, saveHistorySnapshot]);

  /**
   * Load an image source into the canvas and center it
   */
  const loadImage = useCallback(
    async (src: string): Promise<fabric.FabricImage> => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) throw new Error('Canvas not initialized');

      setIsProcessing(true);
      return new Promise((resolve, reject) => {
        fabric.FabricImage.fromURL(src, { crossOrigin: 'anonymous' })
          .then((img) => {
            canvas.clear();
            canvas.backgroundColor = '#18181b';

            // Scale image to fit within canvas bounds
            const scale = Math.min(
              (canvas.width! * 0.85) / img.width!,
              (canvas.height! * 0.85) / img.height!,
              1
            );

            img.set({
              originX: 'center',
              originY: 'center',
              left: canvas.width! / 2,
              top: canvas.height! / 2,
              scaleX: scale,
              scaleY: scale,
              selectable: false, // Keep base image locked in center by default
              hoverCursor: 'default',
            });

            mainImageRef.current = img;
            canvas.add(img);
            canvas.renderAll();

            // Initialize History with original image
            historyStackRef.current = [JSON.stringify(canvas.toJSON())];
            redoStackRef.current = [];
            setHistoryStatus(false, false);

            setIsProcessing(false);
            resolve(img);
          })
          .catch((err) => {
            setIsProcessing(false);
            reject(err);
          });
      });
    },
    [setIsProcessing, setHistoryStatus]
  );

  /**
   * Apply Adjustments & Filters to the base image
   */
  const applyFilters = useCallback(
    (adj: ImageAdjustments, preset: FilterPreset = 'normal') => {
      const img = mainImageRef.current;
      const canvas = fabricCanvasRef.current;
      if (!img || !canvas) return;

      const filtersList: fabric.filters.BaseFilter[] = [];

      // 1. Brightness: Slider range -100..100 -> fabric value -1..1
      if (adj.brightness !== 0) {
        filtersList.push(
          new fabric.filters.Brightness({
            brightness: adj.brightness / 100,
          })
        );
      }

      // 2. Contrast: Slider range -100..100 -> fabric value -1..1
      if (adj.contrast !== 0) {
        filtersList.push(
          new fabric.filters.Contrast({
            contrast: adj.contrast / 100,
          })
        );
      }

      // 3. Saturation: Slider range -100..100 -> fabric value -1..1
      if (adj.saturation !== 0) {
        filtersList.push(
          new fabric.filters.Saturation({
            saturation: adj.saturation / 100,
          })
        );
      }

      // 4. Blur: Slider range 0..100 -> fabric value 0..1
      if (adj.blur > 0) {
        filtersList.push(
          new fabric.filters.Blur({
            blur: adj.blur / 100,
          })
        );
      }

      // 5. Sharpness (Convolution Filter Kernel)
      if (adj.sharpness > 0) {
        const factor = (adj.sharpness / 100) * 1.5;
        const kernel = [
          0, -factor, 0,
          -factor, 1 + 4 * factor, -factor,
          0, -factor, 0
        ];
        filtersList.push(
          new fabric.filters.Convolute({
            matrix: kernel,
          })
        );
      }

      // 6. Color Filter Presets
      switch (preset) {
        case 'grayscale':
          filtersList.push(new fabric.filters.Grayscale());
          break;
        case 'sepia':
          filtersList.push(new fabric.filters.Sepia());
          break;
        case 'vintage':
          filtersList.push(new fabric.filters.Sepia());
          filtersList.push(new fabric.filters.Contrast({ contrast: 0.15 }));
          break;
        case 'blackwhite':
          filtersList.push(new fabric.filters.BlackWhite());
          break;
        case 'warm':
          filtersList.push(
            new fabric.filters.ColorMatrix({
              matrix: [
                1.1, 0, 0, 0, 0,
                0, 1.0, 0, 0, 0,
                0, 0, 0.9, 0, 0,
                0, 0, 0, 1, 0,
              ],
            })
          );
          break;
        case 'cool':
          filtersList.push(
            new fabric.filters.ColorMatrix({
              matrix: [
                0.9, 0, 0, 0, 0,
                0, 1.0, 0, 0, 0,
                0, 0, 1.15, 0, 0,
                0, 0, 0, 1, 0,
              ],
            })
          );
          break;
        default:
          break;
      }

      img.filters = filtersList;
      img.applyFilters();
      canvas.requestRenderAll();
    },
    []
  );

  // Sync adjustments and filter preset with canvas in real-time
  useEffect(() => {
    applyFilters(adjustments, activeFilterPreset);
  }, [adjustments, activeFilterPreset, applyFilters]);

  /**
   * Reset Zoom to Fit
   */
  const resetZoom = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoomLevel(1);
    canvas.renderAll();
  }, [setZoomLevel]);

  /**
   * Export high-quality image from canvas
   */
  const exportImage = useCallback(
    (format: 'png' | 'jpeg' | 'webp' = 'png', quality = 0.92) => {
      const canvas = fabricCanvasRef.current;
      const img = mainImageRef.current;
      if (!canvas || !img) return null;

      // Deselect all items before export to remove bounding boxes
      canvas.discardActiveObject();
      canvas.renderAll();

      return canvas.toDataURL({
        format,
        quality,
        multiplier: 1 / (img.scaleX || 1), // Export at original resolution
      });
    },
    []
  );

  return {
    canvasRef,
    fabricCanvas: fabricCanvasRef.current,
    loadImage,
    exportImage,
    resetZoom,
    undo,
    redo,
    saveHistorySnapshot,
  };
};
