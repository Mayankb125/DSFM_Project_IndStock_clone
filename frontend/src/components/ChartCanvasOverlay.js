import React, { useEffect, useRef } from "react";
import { Canvas, Line, Rect, Textbox } from "fabric";
import { v4 as uuidv4 } from "uuid";

export default function ChartCanvasOverlay({
  width,
  height,
  activeTool,
  annotations,
  setAnnotations,
  symbol,
}) {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef(null);
  const tempObjRef = useRef(null);

  // Initialize fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      selection: activeTool === "select",
      preserveObjectStacking: true,
      backgroundColor: "transparent",
    });
    canvas.setWidth(width);
    canvas.setHeight(height);
    fabricRef.current = canvas;

    // Load existing annotations
    if (annotations && annotations.length > 0) {
      annotations.forEach((ann) => {
        try {
          addAnnotation(canvas, ann);
        } catch (e) {
          console.error("Error loading annotation:", e);
        }
      });
    }

    // Handle object modifications
    canvas.on("object:modified", (e) => {
      const obj = e.target;
      if (obj && obj.annotationId) {
        const updated = serialize(obj);
        setAnnotations((prev) =>
          prev.map((a) => (a.id === obj.annotationId ? updated : a))
        );
      }
    });

    // Handle object removal
    canvas.on("object:removed", (e) => {
      const obj = e.target || e.object;
      if (obj && obj.annotationId) {
        setAnnotations((prev) => prev.filter((a) => a.id !== obj.annotationId));
      }
    });

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  // Update canvas size when dimensions change
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.setWidth(width);
      fabricRef.current.setHeight(height);
      fabricRef.current.renderAll();
    }
  }, [width, height]);

  // Save to localStorage whenever annotations change
  useEffect(() => {
    if (symbol && annotations) {
      try {
        localStorage.setItem(`annotations_${symbol}`, JSON.stringify(annotations));
      } catch (e) {
        console.error("Error saving annotations:", e);
      }
    }
  }, [annotations, symbol]);

  // Drawing logic based on active tool
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Remove existing event listeners
    canvas.off("mouse:down");
    canvas.off("mouse:move");
    canvas.off("mouse:up");
    canvas.selection = activeTool === "select";
    canvas.defaultCursor = activeTool === "select" ? "default" : "crosshair";

    // Reset drawing state
    isDrawingRef.current = false;
    startPointRef.current = null;
    if (tempObjRef.current) {
      canvas.remove(tempObjRef.current);
      tempObjRef.current = null;
    }

    // Trendline drawing
    if (activeTool === "trendline") {
      canvas.on("mouse:down", (opt) => {
        const pointer = canvas.getPointer(opt.e);
        isDrawingRef.current = true;
        startPointRef.current = pointer;

        const line = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: "#0ea5e9",
          strokeWidth: 2,
          selectable: false,
          evented: false,
        });
        canvas.add(line);
        tempObjRef.current = line;
      });

      canvas.on("mouse:move", (opt) => {
        if (!isDrawingRef.current || !tempObjRef.current || !startPointRef.current) return;
        const pointer = canvas.getPointer(opt.e);
        tempObjRef.current.set({
          x2: pointer.x,
          y2: pointer.y,
        });
        canvas.renderAll();
      });

      canvas.on("mouse:up", () => {
        if (!tempObjRef.current) return;
        const line = tempObjRef.current;
        line.annotationId = uuidv4();
        line.selectable = true;
        line.evented = true;
        const annotation = serialize(line);
        setAnnotations((prev) => [...prev, annotation]);
        tempObjRef.current = null;
        isDrawingRef.current = false;
        startPointRef.current = null;
      });
    }

    // Rectangle drawing
    if (activeTool === "rect") {
      canvas.on("mouse:down", (opt) => {
        const pointer = canvas.getPointer(opt.e);
        isDrawingRef.current = true;
        startPointRef.current = pointer;

        const rect = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: "rgba(14, 165, 233, 0.12)",
          stroke: "#0ea5e9",
          strokeWidth: 2,
          selectable: false,
          evented: false,
        });
        canvas.add(rect);
        tempObjRef.current = rect;
      });

      canvas.on("mouse:move", (opt) => {
        if (!isDrawingRef.current || !tempObjRef.current || !startPointRef.current) return;
        const pointer = canvas.getPointer(opt.e);
        const left = Math.min(startPointRef.current.x, pointer.x);
        const top = Math.min(startPointRef.current.y, pointer.y);
        const width = Math.abs(pointer.x - startPointRef.current.x);
        const height = Math.abs(pointer.y - startPointRef.current.y);

        tempObjRef.current.set({
          left,
          top,
          width,
          height,
        });
        canvas.renderAll();
      });

      canvas.on("mouse:up", () => {
        if (!tempObjRef.current) return;
        const rect = tempObjRef.current;
        rect.annotationId = uuidv4();
        rect.selectable = true;
        rect.evented = true;
        const annotation = serialize(rect);
        setAnnotations((prev) => [...prev, annotation]);
        tempObjRef.current = null;
        isDrawingRef.current = false;
        startPointRef.current = null;
      });
    }

    // Horizontal line drawing
    if (activeTool === "hline") {
      canvas.on("mouse:down", (opt) => {
        const pointer = canvas.getPointer(opt.e);
        const line = new Line([0, pointer.y, canvas.getWidth(), pointer.y], {
          stroke: "#ef4444",
          strokeWidth: 1,
          selectable: true,
        });
        line.annotationId = uuidv4();
        canvas.add(line);
        const annotation = serialize(line);
        setAnnotations((prev) => [...prev, annotation]);
      });
    }

    // Text drawing
    if (activeTool === "text") {
      canvas.on("mouse:down", (opt) => {
        const pointer = canvas.getPointer(opt.e);
        const text = new Textbox("Note", {
          left: pointer.x,
          top: pointer.y,
          fontSize: 14,
          fill: "#ffffff",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          padding: 4,
          selectable: true,
          editable: true,
        });
        text.annotationId = uuidv4();
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        const annotation = serialize(text);
        setAnnotations((prev) => [...prev, annotation]);

        // Update annotation when text changes
        text.on("changed", () => {
          const updated = serialize(text);
          setAnnotations((prev) =>
            prev.map((a) => (a.id === text.annotationId ? updated : a))
          );
        });
      });
    }

    // Erase tool
    if (activeTool === "erase") {
      canvas.on("mouse:down", (opt) => {
        const target = opt.target;
        if (target && target.annotationId) {
          canvas.remove(target);
          setAnnotations((prev) => prev.filter((a) => a.id !== target.annotationId));
        }
      });
    }
  }, [activeTool, setAnnotations]);

  // Helper: add annotation object to canvas
  function addAnnotation(canvas, ann) {
    try {
      if (ann.type === "trendline") {
        const line = new Line(ann.coords, {
          stroke: "#0ea5e9",
          strokeWidth: 2,
          selectable: true,
        });
        line.annotationId = ann.id;
        canvas.add(line);
      } else if (ann.type === "rect") {
        const rect = new Rect({
          left: ann.coords[0],
          top: ann.coords[1],
          width: ann.coords[2],
          height: ann.coords[3],
          fill: "rgba(14, 165, 233, 0.12)",
          stroke: "#0ea5e9",
          strokeWidth: 2,
          selectable: true,
        });
        rect.annotationId = ann.id;
        canvas.add(rect);
      } else if (ann.type === "hline") {
        const canvasWidth = canvas.getWidth();
        const y = ann.coords[1] || ann.coords[3] || 0;
        const line = new Line([0, y, canvasWidth, y], {
          stroke: "#ef4444",
          strokeWidth: 1,
          selectable: true,
        });
        line.annotationId = ann.id;
        canvas.add(line);
      } else if (ann.type === "text") {
        const text = new Textbox(ann.text || "Note", {
          left: ann.coords[0],
          top: ann.coords[1],
          fontSize: 14,
          fill: "#ffffff",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          padding: 4,
          selectable: true,
          editable: true,
        });
        text.annotationId = ann.id;
        canvas.add(text);
      }
    } catch (e) {
      console.error("Error adding annotation:", e, ann);
    }
  }

  // Serialize fabric object to JSON-friendly model
  function serialize(obj) {
    const id = obj.annotationId || uuidv4();
    let type, coords, text;
    const canvas = fabricRef.current;

    if (obj.type === "line") {
      // Check if it's a horizontal line (y1 === y2 and spans full width or close to it)
      const canvasWidth = canvas ? canvas.getWidth() : width;
      const isHorizontal = Math.abs(obj.y1 - obj.y2) < 2;
      const spansWidth = Math.abs(obj.x2 - obj.x1) > canvasWidth * 0.9 || obj.x1 === 0 || obj.x2 === canvasWidth;
      
      if (isHorizontal && spansWidth) {
        type = "hline";
        coords = [0, obj.y1, canvasWidth, obj.y1];
      } else {
        type = "trendline";
        coords = [obj.x1, obj.y1, obj.x2, obj.y2];
      }
    } else if (obj.type === "rect") {
      type = "rect";
      coords = [obj.left, obj.top, obj.width, obj.height];
    } else if (obj.type === "textbox" || obj.type === "text") {
      type = "text";
      coords = [obj.left, obj.top, 0, 0];
      text = obj.text || "";
    } else {
      return null;
    }

    return { id, type, coords, text: text || "" };
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-auto"
      style={{ zIndex: 10 }}
    />
  );
}

