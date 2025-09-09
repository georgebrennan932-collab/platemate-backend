import React, { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
}

interface ConfettiCelebrationProps {
  trigger: boolean;
  duration?: number;
  particleCount?: number;
  onComplete?: () => void;
}

interface ScreenFlash {
  opacity: number;
  color: string;
}

export function ConfettiCelebration({ 
  trigger, 
  duration = 3000, 
  particleCount = 50,
  onComplete 
}: ConfettiCelebrationProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [screenFlash, setScreenFlash] = useState<ScreenFlash>({ opacity: 0, color: '#FFD700' });
  const [showText, setShowText] = useState(false);

  const colors = [
    '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
    '#FF1493', '#00FF7F', '#FF4500', '#8A2BE2', '#DC143C',
    '#00CED1', '#FFB6C1', '#98FB98', '#F0E68C', '#DDA0DD'
  ];

  const createConfettiPiece = (id: number): ConfettiPiece => {
    // Get actual viewport dimensions for mobile
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    
    // Create spawn zones that truly cover the entire screen including mobile
    const spawnType = Math.floor(Math.random() * 5);
    let zone;
    
    switch (spawnType) {
      case 0: // Top edge - rain down
        zone = {
          x: Math.random() * viewWidth,
          y: -50 - Math.random() * 100, // Start well above screen
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 6 + 4 // Fall down
        };
        break;
      case 1: // Bottom edge - shoot up
        zone = {
          x: Math.random() * viewWidth,
          y: viewHeight + 50 + Math.random() * 100, // Start well below screen
          vx: (Math.random() - 0.5) * 4,
          vy: -(Math.random() * 6 + 4) // Shoot up
        };
        break;
      case 2: // Left edge - sweep right
        zone = {
          x: -50 - Math.random() * 100, // Start well left of screen
          y: Math.random() * viewHeight,
          vx: Math.random() * 6 + 4, // Move right
          vy: (Math.random() - 0.5) * 4
        };
        break;
      case 3: // Right edge - sweep left
        zone = {
          x: viewWidth + 50 + Math.random() * 100, // Start well right of screen
          y: Math.random() * viewHeight,
          vx: -(Math.random() * 6 + 4), // Move left
          vy: (Math.random() - 0.5) * 4
        };
        break;
      case 4: // Center explosion - burst outward
        const centerX = viewWidth * (0.3 + Math.random() * 0.4); // Random center area
        const centerY = viewHeight * (0.3 + Math.random() * 0.4);
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 6;
        zone = {
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed
        };
        break;
      default:
        zone = { x: 0, y: 0, vx: 0, vy: 0 };
    }
    
    return {
      id,
      x: zone.x,
      y: zone.y,
      rotation: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 12 + 8, // 8-20px (even bigger)
      velocityX: zone.vx,
      velocityY: zone.vy,
      rotationSpeed: (Math.random() - 0.5) * 20, // Much faster rotation
    };
  };

  useEffect(() => {
    if (!trigger) return;

    // Create initial confetti pieces
    const pieces = Array.from({ length: particleCount }, (_, i) => createConfettiPiece(i));
    setConfetti(pieces);
    setIsActive(true);
    setShowText(true);
    
    // Screen flash effect (shorter)
    setScreenFlash({ opacity: 0.6, color: '#FFD700' });
    setTimeout(() => setScreenFlash({ opacity: 0.3, color: '#FF6B6B' }), 80);
    setTimeout(() => setScreenFlash({ opacity: 0.1, color: '#4ECDC4' }), 160);
    setTimeout(() => setScreenFlash({ opacity: 0, color: '#FFD700' }), 300);
    
    // Hide text after 1.5 seconds
    setTimeout(() => setShowText(false), 1500);

    // Animation loop
    let animationId: number;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      if (elapsed >= duration) {
        setIsActive(false);
        setConfetti([]);
        setShowText(false);
        setScreenFlash({ opacity: 0, color: '#FFD700' });
        onComplete?.();
        return;
      }

      setConfetti(prevConfetti => 
        prevConfetti.map(piece => ({
          ...piece,
          x: piece.x + piece.velocityX,
          y: piece.y + piece.velocityY,
          rotation: piece.rotation + piece.rotationSpeed,
          velocityY: piece.velocityY + 0.1, // gravity
        })).filter(piece => 
          piece.y < window.innerHeight + 200 && 
          piece.y > -200 && 
          piece.x < window.innerWidth + 200 && 
          piece.x > -200
        ) // Remove pieces that go far off any edge
      );

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [trigger, duration, particleCount, onComplete]);

  if (!isActive || confetti.length === 0) return null;

  return (
    <div 
      className="fixed pointer-events-none z-50 overflow-hidden"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        position: 'fixed'
      }}
    >
      {/* Screen Flash Effect */}
      {screenFlash.opacity > 0 && (
        <div 
          className="absolute transition-opacity duration-100"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            backgroundColor: screenFlash.color,
            opacity: screenFlash.opacity,
            mixBlendMode: 'screen'
          }}
        />
      )}
      
      {/* Achievement Text */}
      {showText && (
        <div 
          className="absolute flex items-center justify-center"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%'
          }}
        >
          <div className="text-center animate-bounce">
            <div className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-2xl animate-pulse">
              🎉 GOAL ACHIEVED! 🎉
            </div>
            <div className="text-lg md:text-2xl font-semibold text-yellow-300 drop-shadow-lg">
              Keep up the amazing work!
            </div>
          </div>
        </div>
      )}
      
      {/* Confetti Particles */}
      {confetti.map(piece => {
        const isSpecial = Math.random() > 0.7;
        const shape = isSpecial 
          ? (Math.random() > 0.5 ? '⭐' : '❤️') 
          : '';
        
        return (
          <div
            key={piece.id}
            className="absolute flex items-center justify-center"
            style={{
              left: `${piece.x}px`,
              top: `${piece.y}px`,
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              backgroundColor: shape ? 'transparent' : piece.color,
              transform: `rotate(${piece.rotation}deg)`,
              borderRadius: !shape && Math.random() > 0.3 ? '50%' : '2px',
              boxShadow: `0 0 ${piece.size}px ${piece.color}60`,
              fontSize: shape ? `${piece.size * 0.8}px` : 'inherit',
              filter: `brightness(1.2) saturate(1.3)`,
            }}
          >
            {shape}
          </div>
        );
      })}
    </div>
  );
}

// Hook for easy confetti triggering
export function useConfetti() {
  const [shouldTrigger, setShouldTrigger] = useState(false);

  const triggerConfetti = () => {
    setShouldTrigger(true);
  };

  const resetTrigger = () => {
    setShouldTrigger(false);
  };

  return {
    shouldTrigger,
    triggerConfetti,
    resetTrigger,
  };
}