"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import {
  Pen,
  ArrowUpRight,
  Type,
  Highlighter,
  Undo2,
  Redo2,
  X,
  Save,
  Palette,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

type AnnotationTool = "pen" | "arrow" | "text" | "highlight";
type AnnotationColor = "#EF4444" | "#EAB308" | "#3B82F6" | "#22C55E";

interface DrawPoint {
  x: number;
  y: number;
}

interface AnnotationStroke {
  tool: AnnotationTool;
  color: string;
  lineWidth: number;
  points: DrawPoint[];
  text?: string;
}

// =============================================================================
// Constants
// =============================================================================

const COLORS: { value: AnnotationColor; label: string; tw: string }[] = [
  { value: "#EF4444", label: "Red", tw: "bg-red-500" },
  { value: "#EAB308", label: "Yellow", tw: "bg-yellow-500" },
  { value: "#3B82F6", label: "Blue", tw: "bg-blue-500" },
  { value: "#22C55E", label: "Green", tw: "bg-green-500" },
];

const LINE_WIDTHS = [2, 4, 6] as const;

// =============================================================================
// Props
// =============================================================================

interface PhotoAnnotatorProps {
  imageBlob: Blob;
  onSave: (annotatedBlob: Blob) => void;
  onCancel: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function PhotoAnnotator({
  imageBlob,
  onSave,
  onCancel,
}: PhotoAnnotatorProps) {
  const t = useTranslations("fieldwork.annotator");

  // State
  const [tool, setTool] = useState<AnnotationTool>("pen");
  const [color, setColor] = useState<AnnotationColor>("#EF4444");
  const [lineWidth, setLineWidth] = useState<number>(4);
  const [strokes, setStrokes] = useState<AnnotationStroke[]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationStroke[]>([]);
  const [saving, setSaving] = useState(false);
  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [textValue, setTextValue] = useState("");

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<AnnotationStroke | null>(null);
  const imageUrlRef = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load image
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const url = URL.createObjectURL(imageBlob);
    imageUrlRef.current = url;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      resizeCanvas();
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
      imageUrlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageBlob]);

  // ---------------------------------------------------------------------------
  // Resize canvas to fit container while maintaining aspect ratio
  // ---------------------------------------------------------------------------

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = imageRef.current;
    if (!canvas || !container || !img) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const aspect = img.naturalWidth / img.naturalHeight;

    let w: number, h: number;
    if (containerWidth / containerHeight > aspect) {
      h = containerHeight;
      w = h * aspect;
    } else {
      w = containerWidth;
      h = w / aspect;
    }

    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    redrawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  useLayoutEffect(() => {
    resizeCanvas();
  }, [resizeCanvas]);

  useEffect(() => {
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // ---------------------------------------------------------------------------
  // Redraw canvas — image + all strokes
  // ---------------------------------------------------------------------------

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }
    // Draw current active stroke
    if (currentStrokeRef.current) {
      drawStroke(ctx, currentStrokeRef.current);
    }
  }, [strokes]);

  // ---------------------------------------------------------------------------
  // Get canvas-relative coordinates from event
  // ---------------------------------------------------------------------------

  function getCanvasPoint(
    e: React.MouseEvent | React.TouchEvent
  ): DrawPoint | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX: number, clientY: number;
    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  // ---------------------------------------------------------------------------
  // Drawing handlers
  // ---------------------------------------------------------------------------

  function handlePointerDown(e: React.MouseEvent | React.TouchEvent) {
    if (tool === "text") {
      const pt = getCanvasPoint(e);
      if (pt) {
        setTextInput(pt);
        setTextValue("");
      }
      return;
    }

    const pt = getCanvasPoint(e);
    if (!pt) return;

    isDrawingRef.current = true;
    currentStrokeRef.current = {
      tool,
      color,
      lineWidth,
      points: [pt],
    };
  }

  function handlePointerMove(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const pt = getCanvasPoint(e);
    if (!pt) return;

    currentStrokeRef.current.points.push(pt);
    redrawCanvas();
  }

  function handlePointerUp() {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;

    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    if (stroke.points.length >= 2) {
      setStrokes((prev) => [...prev, stroke]);
      setRedoStack([]);
    }
    redrawCanvas();
  }

  // ---------------------------------------------------------------------------
  // Text placement
  // ---------------------------------------------------------------------------

  function handlePlaceText() {
    if (!textInput || !textValue.trim()) {
      setTextInput(null);
      return;
    }

    const stroke: AnnotationStroke = {
      tool: "text",
      color,
      lineWidth,
      points: [textInput],
      text: textValue.trim(),
    };

    setStrokes((prev) => [...prev, stroke]);
    setRedoStack([]);
    setTextInput(null);
    setTextValue("");
  }

  // ---------------------------------------------------------------------------
  // Undo / Redo
  // ---------------------------------------------------------------------------

  function handleUndo() {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, last]);
      return prev.slice(0, -1);
    });
  }

  function handleRedo() {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setStrokes((s) => [...s, last]);
      return prev.slice(0, -1);
    });
  }

  // ---------------------------------------------------------------------------
  // Save — flatten canvas to blob
  // ---------------------------------------------------------------------------

  async function handleSave() {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    setSaving(true);
    try {
      // Create a full-resolution canvas for export
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = img.naturalWidth;
      exportCanvas.height = img.naturalHeight;
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) return;

      // Draw original image at full resolution
      ctx.drawImage(img, 0, 0);

      // Scale strokes to full resolution
      const scaleX = img.naturalWidth / canvas.width;
      const scaleY = img.naturalHeight / canvas.height;

      for (const stroke of strokes) {
        const scaled: AnnotationStroke = {
          ...stroke,
          lineWidth: stroke.lineWidth * scaleX,
          points: stroke.points.map((p) => ({
            x: p.x * scaleX,
            y: p.y * scaleY,
          })),
        };
        drawStroke(ctx, scaled);
      }

      // Export as blob
      const blob = await new Promise<Blob | null>((resolve) =>
        exportCanvas.toBlob(resolve, "image/jpeg", 0.92)
      );

      if (blob) {
        onSave(blob);
      }
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-[100vw] max-h-[100vh] w-full h-full p-0 gap-0 [&>button]:hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="px-4 py-2 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm">{t("title")}</DialogTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleUndo}
                  disabled={strokes.length === 0}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onCancel}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Canvas area */}
          <div
            ref={containerRef}
            className="flex-1 relative flex items-center justify-center bg-black/90 overflow-hidden touch-none"
          >
            <canvas
              ref={canvasRef}
              className="cursor-crosshair"
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />

            {/* Text input overlay */}
            {textInput && (
              <div
                className="absolute z-10"
                style={{
                  left: textInput.x,
                  top: textInput.y,
                }}
              >
                <input
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  type="text"
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePlaceText();
                    if (e.key === "Escape") setTextInput(null);
                  }}
                  onBlur={handlePlaceText}
                  className="bg-white/90 border rounded px-2 py-1 text-sm min-w-[120px] focus:outline-none"
                  style={{ color }}
                  placeholder={t("textPlaceholder")}
                />
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="shrink-0 border-t bg-background px-3 py-2 space-y-2">
            {/* Tools */}
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {(
                  [
                    { value: "pen" as const, icon: Pen },
                    { value: "arrow" as const, icon: ArrowUpRight },
                    { value: "text" as const, icon: Type },
                    { value: "highlight" as const, icon: Highlighter },
                  ] as const
                ).map(({ value, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTool(value)}
                    className={cn(
                      "h-9 w-9 flex items-center justify-center rounded-md transition-colors",
                      tool === value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>

              <div className="w-px h-6 bg-border" />

              {/* Color picker */}
              <div className="flex items-center gap-1">
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 transition-transform",
                      c.tw,
                      color === c.value
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    )}
                    aria-label={c.label}
                  />
                ))}
              </div>

              <div className="w-px h-6 bg-border" />

              {/* Line width */}
              <div className="flex items-center gap-1">
                {LINE_WIDTHS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setLineWidth(w)}
                    className={cn(
                      "h-8 w-8 rounded flex items-center justify-center transition-colors",
                      lineWidth === w
                        ? "bg-muted"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <span
                      className="rounded-full bg-foreground"
                      style={{ width: w * 2, height: w * 2 }}
                    />
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              {/* Save / Cancel */}
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={onCancel}
              >
                {t("cancel")}
              </Button>
              <Button
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => void handleSave()}
                disabled={saving || strokes.length === 0}
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? t("saving") : t("save")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Draw a single stroke onto a canvas context
// =============================================================================

function drawStroke(ctx: CanvasRenderingContext2D, stroke: AnnotationStroke) {
  const { tool, color, lineWidth, points, text } = stroke;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (tool) {
    case "pen": {
      if (points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      break;
    }

    case "arrow": {
      if (points.length < 2) break;
      const start = points[0];
      const end = points[points.length - 1];

      // Shaft
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLen = lineWidth * 5;
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLen * Math.cos(angle - Math.PI / 6),
        end.y - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLen * Math.cos(angle + Math.PI / 6),
        end.y - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
      break;
    }

    case "text": {
      if (!text || points.length === 0) break;
      const fontSize = Math.max(14, lineWidth * 5);
      ctx.font = `bold ${fontSize}px sans-serif`;
      // Text shadow for readability
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(text, points[0].x, points[0].y);
      break;
    }

    case "highlight": {
      if (points.length < 2) break;
      const start2 = points[0];
      const end2 = points[points.length - 1];
      const x = Math.min(start2.x, end2.x);
      const y = Math.min(start2.y, end2.y);
      const w = Math.abs(end2.x - start2.x);
      const h = Math.abs(end2.y - start2.y);
      ctx.globalAlpha = 0.3;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
      ctx.strokeRect(x, y, w, h);
      break;
    }
  }

  ctx.restore();
}
