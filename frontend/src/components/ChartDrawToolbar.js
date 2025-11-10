import React from "react";
import { MousePointer, PenTool, Minus, Square, Type, Trash2 } from "lucide-react";

const tools = [
  { id: "select", label: "Select", icon: MousePointer },
  { id: "trendline", label: "Trendline", icon: PenTool },
  { id: "hline", label: "Horizontal Line", icon: Minus },
  { id: "rect", label: "Rectangle", icon: Square },
  { id: "text", label: "Text", icon: Type },
  { id: "erase", label: "Erase", icon: Trash2 },
];

export default function ChartDrawToolbar({ activeTool, onSelectTool }) {
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-50">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            title={tool.label}
            className={`p-3 rounded-lg shadow-lg hover:scale-105 transition-all duration-150 ${
              activeTool === tool.id
                ? "bg-cyan-500 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <Icon size={18} />
          </button>
        );
      })}
    </div>
  );
}

