import React, { useId } from 'react';
import './NeuralFluidLoader.css';

export default function NeuralFluidLoader({ status = 'active', size = 0.55, className = '', style = {} }) {
  const rawId = useId();
  const clipId = `clipping_${rawId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  const statusClass = status ? status.toLowerCase() : 'active';

  return (
    <div
      className={`loader ${statusClass} ${className}`}
      style={{
        '--size': size,
        '--clip-url': `url(#${clipId})`,
        ...style
      }}
    >
      <svg width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <defs>
          <clipPath id={clipId}>
            <polygon points="50 0, 100 25, 100 75, 50 100, 0 75, 0 25" />
            <polygon points="50 0, 100 25, 100 75, 50 100, 0 75, 0 25" />
            <polygon points="50 0, 100 25, 100 75, 50 100, 0 75, 0 25" />
            <polygon points="50 0, 100 25, 100 75, 50 100, 0 75, 0 25" />
            <polygon points="50 0, 100 25, 100 75, 50 100, 0 75, 0 25" />
            <polygon points="50 0, 100 25, 100 75, 50 100, 0 75, 0 25" />
            <polygon points="50 0, 100 25, 100 75, 50 100, 0 75, 0 25" />
          </clipPath>
        </defs>
      </svg>
      <div className="box" />
    </div>
  );
}
