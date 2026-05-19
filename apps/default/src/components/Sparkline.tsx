import React from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = '#22c55e',
  width = 80,
  height = 24,
}) => {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polyline = points.join(' ');

  // Area fill
  const first = points[0].split(',');
  const last = points[points.length - 1].split(',');
  const area = `${pad},${h + pad} ${polyline} ${last[0]},${h + pad}`;

  const trend = data[data.length - 1] >= data[0];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={area}
        fill={`url(#sg-${color.replace('#', '')})`}
      />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      <circle
        cx={parseFloat(last[0])}
        cy={parseFloat(last[1])}
        r="2"
        fill={color}
      />
      {/* Trend arrow */}
      <text
        x={width - 1}
        y={parseFloat(last[1]) - 3}
        fontSize="7"
        fill={trend ? '#22c55e' : '#ef4444'}
        textAnchor="end"
      >
        {trend ? '▲' : '▼'}
      </text>
    </svg>
  );
};

export default Sparkline;
