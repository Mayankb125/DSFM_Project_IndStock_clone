import React from "react";
import { MousePointer, TrendingUp, Minus, Square, Circle, Type, Trash2, PenTool, Move, Undo, Redo, ZoomIn, ZoomOut } from "lucide-react";

const tools = [
  { id: "select", label: "Select", icon: MousePointer },
  { id: "cursor", label: "Cursor", icon: Move },
  { id: "trendline", label: "Trendline", icon: TrendingUp },
  { id: "ray", label: "Ray", icon: PenTool },
  { id: "hline", label: "Horizontal Line", icon: Minus },
  { id: "vline", label: "Vertical Line", icon: "│" },
  { id: "rect", label: "Rectangle", icon: Square },
  { id: "circle", label: "Circle", icon: Circle },
  { id: "text", label: "Text", icon: Type },
  { id: "brush", label: "Brush", icon: "✏" },
  { id: "erase", label: "Eraser", icon: Trash2 },
  { id: "divider", label: "", icon: null },
  { id: "undo", label: "Undo", icon: Undo },
  { id: "redo", label: "Redo", icon: Redo },
];

export default function ChartDrawToolbar({ activeTool, onSelectTool }) {
  return (
    <div className="flex flex-col bg-[#1f2937] rounded-lg shadow-2xl border border-gray-700 py-2">
      {tools.map((tool, index) => {
        // Divider
        if (tool.id === "divider") {
          return (
            <div key="divider" className="my-1 mx-2 h-px bg-gray-700"></div>
          );
        }

        const Icon = tool.icon;
        const isString = typeof Icon === "string";
        
        return (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            title={tool.label}
            className={`mx-2 my-0.5 p-2.5 rounded transition-all duration-200 ${
              activeTool === tool.id
                ? "bg-blue-600 text-white shadow-lg"
                : "text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            {isString ? (
              <span className="text-base leading-none">{Icon}</span>
            ) : Icon ? (
              <Icon size={18} strokeWidth={2} />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

