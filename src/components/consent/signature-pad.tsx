"use client";

import { useRef, useEffect, useState, useCallback } from "react";

import { Button } from "@/components/ui/button";

type Point = { x: number; y: number };

export function SignaturePad({
  onChange,
}: {
  onChange: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPoint = useRef<Point | null>(null);

  const getPoint = useCallback(
    (e: MouseEvent | TouchEvent): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ("touches" in e) {
        const touch = e.touches[0];
        if (!touch) return null;
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const drawLine = useCallback(
    (from: Point, to: Point) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = "#1A1A1A";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    },
    []
  );

  const emitChange = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
  }, [onChange]);

  // One-time canvas initialization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Drawing event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleStart(e: MouseEvent | TouchEvent) {
      e.preventDefault();
      isDrawing.current = true;
      const point = getPoint(e);
      lastPoint.current = point;
    }

    function handleMove(e: MouseEvent | TouchEvent) {
      e.preventDefault();
      if (!isDrawing.current || !lastPoint.current) return;
      const point = getPoint(e);
      if (!point) return;
      drawLine(lastPoint.current, point);
      lastPoint.current = point;
      setHasSignature(true);
    }

    function handleEnd(e: MouseEvent | TouchEvent) {
      e.preventDefault();
      if (isDrawing.current) {
        isDrawing.current = false;
        lastPoint.current = null;
        emitChange();
      }
    }

    canvas.addEventListener("mousedown", handleStart);
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseup", handleEnd);
    canvas.addEventListener("mouseleave", handleEnd);
    canvas.addEventListener("touchstart", handleStart, { passive: false });
    canvas.addEventListener("touchmove", handleMove, { passive: false });
    canvas.addEventListener("touchend", handleEnd);

    return () => {
      canvas.removeEventListener("mousedown", handleStart);
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseup", handleEnd);
      canvas.removeEventListener("mouseleave", handleEnd);
      canvas.removeEventListener("touchstart", handleStart);
      canvas.removeEventListener("touchmove", handleMove);
      canvas.removeEventListener("touchend", handleEnd);
    };
  }, [getPoint, drawLine, emitChange]);

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange("");
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-border">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full cursor-crosshair touch-none bg-white"
          style={{ height: "150px" }}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {hasSignature ? "Signature captured" : "Sign above using mouse or touch"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
