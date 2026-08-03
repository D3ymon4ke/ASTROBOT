import React, { useId } from 'react';
import './Switch.css';

export function Switch({
  checked,
  onChange,
  disabled = false,
  id: customId,
  name,
  value,
  showStatus = true,
  scale,
  style = {},
  className = '',
  ...restProps
}) {
  const generatedId = useId();
  const inputId = customId || generatedId;

  const combinedStyle = {
    ...(scale ? { transform: `scale(${scale})`, transformOrigin: 'center center' } : {}),
    ...style
  };

  return (
    <div
      className={`neo-toggle-container ${!showStatus ? 'no-status' : ''} ${className}`}
      style={combinedStyle}
    >
      <input
        className="neo-toggle-input"
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        name={name}
        value={value}
        {...restProps}
      />
      <label className="neo-toggle" htmlFor={inputId}>
        <div className="neo-track">
          <div className="neo-background-layer" />
          <div className="neo-grid-layer" />
          <div className="neo-spectrum-analyzer">
            <div className="neo-spectrum-bar" />
            <div className="neo-spectrum-bar" />
            <div className="neo-spectrum-bar" />
            <div className="neo-spectrum-bar" />
            <div className="neo-spectrum-bar" />
          </div>
          <div className="neo-track-highlight" />
        </div>
        <div className="neo-thumb">
          <div className="neo-thumb-ring" />
          <div className="neo-thumb-core">
            <div className="neo-thumb-icon">
              <div className="neo-thumb-wave" />
              <div className="neo-thumb-pulse" />
            </div>
          </div>
        </div>
        <div className="neo-gesture-area" />
        <div className="neo-interaction-feedback">
          <div className="neo-ripple" />
          <div className="neo-progress-arc" />
        </div>
        {showStatus && (
          <div className="neo-status">
            <div className="neo-status-indicator">
              <div className="neo-status-dot" />
              <div className="neo-status-text" />
            </div>
          </div>
        )}
      </label>
    </div>
  );
}

export default Switch;
