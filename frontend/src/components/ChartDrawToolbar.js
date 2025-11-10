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
    <div 
      className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[100] pointer-events-auto"
      style={{ 
        position: 'absolute',
        left: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 100
      }}
    >
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            title={tool.label}
            className={`p-3 rounded-lg shadow-xl hover:scale-110 transition-all duration-150 border ${
              activeTool === tool.id
                ? "bg-cyan-500 text-white border-cyan-400"
                : "bg-gray-800 text-gray-200 hover:bg-gray-700 border-gray-700"
            }`}
          >
            <Icon size={18} />
          </button>
        );
      })}
    </div>
  );
}

