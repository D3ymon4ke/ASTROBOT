import React, { useState, useRef } from 'react';

export default function Landing3DCard({
  children,
  className = '',
  style = {},
  intensity = 15,
  glowColor = 'rgba(139, 92, 246, 0.25)',
  ...props
}) {
  const cardRef = useRef(null);
  const [transformStyle, setTransformStyle] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -intensity;
    const rotateY = ((x - centerX) / centerX) * intensity;

    setTransformStyle(`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`);

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;
    setGlarePosition({ x: glareX, y: glareY, opacity: 0.15 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlarePosition(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      className={`card-3d-tilt ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transformStyle: 'preserve-3d',
        position: 'relative',
        boxShadow: isHovered
          ? `0 20px 40px -15px ${glowColor}, 0 0 25px ${glowColor}`
          : '0 10px 30px rgba(0, 0, 0, 0.3)',
        transition: isHovered
          ? 'transform 0.1s cubic-bezier(0.1, 0, 0.1, 1), box-shadow 0.3s ease'
          : 'transform 0.5s cubic-bezier(0.1, 0, 0.1, 1), box-shadow 0.5s ease',
        ...style
      }}
      {...props}
    >
      {/* Dynamic Glare Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 'inherit',
          background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.25) 0%, transparent 60%)`,
          opacity: glarePosition.opacity,
          pointerEvents: 'none',
          transition: 'opacity 0.3s ease',
          zIndex: 10
        }}
      />
      {children}
    </div>
  );
}
