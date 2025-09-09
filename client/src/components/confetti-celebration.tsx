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
    const startX = Math.random() * window.innerWidth;
    const startY = -10;
    
    return {
      id,
      x: startX,
      y: startY,
      rotation: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4, // 4-12px
      velocityX: (Math.random() - 0.5) * 4, // -2 to 2
      velocityY: Math.random() * 3 + 2, // 2-5 (falling speed)
      rotationSpeed: (Math.random() - 0.5) * 10, // -5 to 5 degrees per frame
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
        })).filter(piece => piece.y < window.innerHeight + 50) // Remove pieces that fall off screen
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