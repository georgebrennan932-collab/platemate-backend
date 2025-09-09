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
    // Create multiple spawn zones across entire screen
    const zones = [
      // Top row (multiple spawn points)
      { x: Math.random() * window.innerWidth, y: -20, vx: (Math.random() - 0.5) * 6, vy: Math.random() * 5 + 3 },
      { x: Math.random() * window.innerWidth, y: -50, vx: (Math.random() - 0.5) * 6, vy: Math.random() * 5 + 4 },
      // Bottom row (shooting up)
      { x: Math.random() * window.innerWidth, y: window.innerHeight + 20, vx: (Math.random() - 0.5) * 6, vy: -(Math.random() * 6 + 3) },
      { x: Math.random() * window.innerWidth, y: window.innerHeight + 50, vx: (Math.random() - 0.5) * 6, vy: -(Math.random() * 6 + 4) },
      // Left side (moving right)
      { x: -30, y: Math.random() * window.innerHeight, vx: Math.random() * 6 + 3, vy: (Math.random() - 0.5) * 6 },
      { x: -60, y: Math.random() * window.innerHeight, vx: Math.random() * 6 + 4, vy: (Math.random() - 0.5) * 6 },
      // Right side (moving left)
      { x: window.innerWidth + 30, y: Math.random() * window.innerHeight, vx: -(Math.random() * 6 + 3), vy: (Math.random() - 0.5) * 6 },
      { x: window.innerWidth + 60, y: Math.random() * window.innerHeight, vx: -(Math.random() * 6 + 4), vy: (Math.random() - 0.5) * 6 },
      // Center bursts (exploding outward)
      { x: window.innerWidth * 0.25, y: window.innerHeight * 0.3, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8 },
      { x: window.innerWidth * 0.75, y: window.innerHeight * 0.3, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8 },
      { x: window.innerWidth * 0.5, y: window.innerHeight * 0.7, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8 },
    ];
    
    const zone = zones[Math.floor(Math.random() * zones.length)];
    
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
    
    // Screen flash effect
    setScreenFlash({ opacity: 0.8, color: '#FFD700' });
    setTimeout(() => setScreenFlash({ opacity: 0.4, color: '#FF6B6B' }), 100);
    setTimeout(() => setScreenFlash({ opacity: 0.2, color: '#4ECDC4' }), 200);
    setTimeout(() => setScreenFlash({ opacity: 0, color: '#FFD700' }), 400);
    
    // Hide text after 2 seconds
    setTimeout(() => setShowText(false), 2000);

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
          piece.y < window.innerHeight + 100 && 
          piece.y > -100 && 
          piece.x < window.innerWidth + 100 && 
          piece.x > -100
        ) // Remove pieces that go off any edge
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
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Screen Flash Effect */}
      {screenFlash.opacity > 0 && (
        <div 
          className="absolute inset-0 transition-opacity duration-100"
          style={{
            backgroundColor: screenFlash.color,
            opacity: screenFlash.opacity,
            mixBlendMode: 'screen'
          }}
        />
      )}
      
      {/* Achievement Text */}
      {showText && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center animate-bounce">
            <div className="text-6xl font-bold text-white mb-4 drop-shadow-2xl animate-pulse">
              🎉 GOAL ACHIEVED! 🎉
            </div>
            <div className="text-2xl font-semibold text-yellow-300 drop-shadow-lg">
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