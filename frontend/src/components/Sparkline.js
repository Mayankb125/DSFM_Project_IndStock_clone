import React, { useMemo } from 'react';

// Tiny inline sparkline using SVG
const Sparkline = ({ data = [], width = 120, height = 32, stroke = '#2563eb' }) => {
  const path = useMemo(() => {
    if (!data || data.length === 0) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const scaleX = (i) => (i / (data.length - 1)) * (width - 2) + 1;
    const scaleY = (v) => {
      if (max === min) return height / 2;
      return height - 1 - ((v - min) / (max - min)) * (height - 2);
    };
    return data.map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(v)}`).join(' ');
  }, [data, width, height]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" />
    </svg>
  );
};

export default Sparkline;


