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

export function ConfettiCelebration({ 
  trigger, 
  duration = 3000, 
  particleCount = 50,
  onComplete 
}: ConfettiCelebrationProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [isActive, setIsActive] = useState(false);

  const colors = [
    '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'
  ];

  const createConfettiPiece = (id: number): ConfettiPiece => {
    // Random spawn position from all edges of the screen
    const spawnEdge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    let startX, startY, velocityX, velocityY;
    
    switch (spawnEdge) {
      case 0: // Top edge
        startX = Math.random() * window.innerWidth;
        startY = -10;
        velocityX = (Math.random() - 0.5) * 4;
        velocityY = Math.random() * 4 + 3; // Falling down
        break;
      case 1: // Right edge
        startX = window.innerWidth + 10;
        startY = Math.random() * window.innerHeight;
        velocityX = -(Math.random() * 4 + 2); // Moving left
        velocityY = (Math.random() - 0.5) * 4;
        break;
      case 2: // Bottom edge
        startX = Math.random() * window.innerWidth;
        startY = window.innerHeight + 10;
        velocityX = (Math.random() - 0.5) * 4;
        velocityY = -(Math.random() * 4 + 2); // Moving up
        break;
      case 3: // Left edge
        startX = -10;
        startY = Math.random() * window.innerHeight;
        velocityX = Math.random() * 4 + 2; // Moving right
        velocityY = (Math.random() - 0.5) * 4;
        break;
      default:
        startX = Math.random() * window.innerWidth;
        startY = -10;
        velocityX = (Math.random() - 0.5) * 4;
        velocityY = Math.random() * 3 + 2;
    }
    
    return {
      id,
      x: startX,
      y: startY,
      rotation: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 10 + 6, // 6-16px (bigger pieces)
      velocityX,
      velocityY,
      rotationSpeed: (Math.random() - 0.5) * 15, // Faster rotation
    };
  };

  useEffect(() => {
    if (!trigger) return;

    // Create initial confetti pieces
    const pieces = Array.from({ length: particleCount }, (_, i) => createConfettiPiece(i));
    setConfetti(pieces);
    setIsActive(true);

    // Animation loop
    let animationId: number;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      if (elapsed >= duration) {
        setIsActive(false);
        setConfetti([]);
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
      {confetti.map(piece => (
        <div
          key={piece.id}
          className="absolute"
          style={{
            left: `${piece.x}px`,
            top: `${piece.y}px`,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px', // Mix of circles and squares
            boxShadow: `0 0 ${piece.size/2}px ${piece.color}40`,
          }}
        />
      ))}
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