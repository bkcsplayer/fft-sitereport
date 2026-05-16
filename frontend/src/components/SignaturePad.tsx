import { useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { RotateCcw } from "lucide-react";

export interface SignaturePadRef {
  getSignature: () => string | null;
  clear: () => void;
}

interface Props {
  onSave?: (base64: string) => void;
  width?: number;
  height?: number;
}

export const SignaturePad = forwardRef<SignaturePadRef, Props>(function SignaturePad(
  { onSave, width = 320, height = 150 },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getCanvas = useCallback(() => canvasRef.current, []);

  useImperativeHandle(ref, () => ({
    getSignature: () => {
      const canvas = getCanvas();
      if (!canvas || !hasSignature) return null;
      return canvas.toDataURL("image/png");
    },
    clear: () => {
      clearCanvas();
    },
  }));

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = getCanvas();
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = getCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = getCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const save = () => {
    const canvas = getCanvas();
    if (!canvas || !hasSignature) return;
    const base64 = canvas.toDataURL("image/png");
    onSave?.(base64);
  };

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-dark-500/30 overflow-hidden inline-block">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
          className="touch-none cursor-crosshair"
          style={{ width, height }}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={clearCanvas}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-dark-800/50 border border-dark-600/30 rounded-lg text-dark-400 text-xs font-medium active:scale-95 transition-all cursor-pointer"
        >
          <RotateCcw size={13} />
          Clear
        </button>
        {onSave && (
          <button
            onClick={save}
            disabled={!hasSignature}
            className="flex-1 px-3 py-2.5 bg-primary-600/15 border border-primary-500/30 rounded-lg text-primary-300 text-xs font-semibold active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            Save Signature
          </button>
        )}
      </div>
    </div>
  );
});
