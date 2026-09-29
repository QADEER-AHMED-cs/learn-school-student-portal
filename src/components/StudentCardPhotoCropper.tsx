// src/components/StudentCardPhotoCropper.tsx
import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Check, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import {
  SCR_OUTPUT_SIZE,
  SCR_OUTPUT_QUALITY,
  SCR_OUTPUT_MAX_KB,
} from '../lib/studentCardRequestConfig';

interface Props {
  imageSrc: string;
  onCancel: () => void;
  onCropped: (result: {
    blob: Blob;
    dataUrl: string;
    sizeBytes: number;
    width: number;
    height: number;
  }) => void;
}

export const StudentCardPhotoCropper: React.FC<Props> = ({
  imageSrc,
  onCancel,
  onCropped,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom]             = useState(1);
  const [rotation, setRotation]     = useState(0);
  const [offset, setOffset]         = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // ── Pointer drag ──────────────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };

  const handlePointerUp = () => setIsDragging(false);

  // ── Confirm crop → draw onto canvas → emit blob + dataUrl ─────────────────
  const handleConfirm = useCallback(async () => {
    const img = imgRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    canvas.width  = SCR_OUTPUT_SIZE;
    canvas.height = SCR_OUTPUT_SIZE;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // White background (in case of PNG transparency)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SCR_OUTPUT_SIZE, SCR_OUTPUT_SIZE);

    ctx.save();
    ctx.translate(SCR_OUTPUT_SIZE / 2, SCR_OUTPUT_SIZE / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // "Cover" style scale: image fills the square
    const scale =
      (SCR_OUTPUT_SIZE / Math.min(img.naturalWidth, img.naturalHeight)) * zoom;
    const drawW = img.naturalWidth  * scale;
    const drawH = img.naturalHeight * scale;

    ctx.drawImage(
      img,
      -drawW / 2 + offset.x,
      -drawH / 2 + offset.y,
      drawW,
      drawH
    );
    ctx.restore();

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
        'image/jpeg',
        SCR_OUTPUT_QUALITY
      );
    });

    if (blob.size > SCR_OUTPUT_MAX_KB * 1024) {
      // Soft warning only — server will still accept it
      console.warn('[Cropper] Output exceeds target size:', blob.size);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', SCR_OUTPUT_QUALITY);

    onCropped({
      blob,
      dataUrl,
      sizeBytes: blob.size,
      width:  SCR_OUTPUT_SIZE,
      height: SCR_OUTPUT_SIZE,
    });
  }, [rotation, zoom, offset, onCropped]);

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-4 max-w-sm w-full space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">Crop Photograph</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-lg"
            aria-label="Close cropper"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Crop viewport */}
        <div className="relative w-full aspect-square bg-gray-900 rounded-xl overflow-hidden">
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop"
            draggable={false}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
              transformOrigin: 'center',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none',
            }}
          />

          {/* Crop frame overlay (rule-of-thirds grid) */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 border-2 border-white/40 rounded-xl" />
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
          </div>
        </div>

        {/* Zoom + Rotate controls */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4 text-gray-700" />
          </button>

          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1"
            aria-label="Zoom"
          />

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4 text-gray-700" />
          </button>

          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            aria-label="Rotate 90°"
          >
            <RotateCw className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-primary-green text-white text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Use Photo
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StudentCardPhotoCropper;