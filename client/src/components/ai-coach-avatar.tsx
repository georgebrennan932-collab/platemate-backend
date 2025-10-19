import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import militaryAvatar from "@assets/avatars/military_avatar.webp";
import gymBroAvatar from "@assets/avatars/gym_bro_avatar.webp";
import zenAvatar from "@assets/avatars/zen_avatar.webp";
import clinicalAvatar from "@assets/avatars/clinical_avatar.webp";
import darkHumourAvatar from "@assets/avatars/dark_humour_avatar.webp";

export type PersonalityType = 'military' | 'gym_bro' | 'zen' | 'clinical' | 'dark_humour';

interface AvatarConfig {
  image: string;
  glowColor: string;
  particleColor: string;
  name: string;
}

const AVATAR_CONFIG: Record<PersonalityType, AvatarConfig> = {
  military: {
    image: militaryAvatar,
    glowColor: 'rgba(239, 68, 68, 0.6)', // Red
    particleColor: '#ef4444',
    name: 'Sergeant Stone'
  },
  gym_bro: {
    image: gymBroAvatar,
    glowColor: 'rgba(34, 197, 94, 0.6)', // Green
    particleColor: '#22c55e',
    name: 'Coach Mike'
  },
  zen: {
    image: zenAvatar,
    glowColor: 'rgba(168, 85, 247, 0.6)', // Purple
    particleColor: '#a855f7',
    name: 'Maya'
  },
  clinical: {
    image: clinicalAvatar,
    glowColor: 'rgba(6, 182, 212, 0.6)', // Cyan
    particleColor: '#06b6d4',
    name: 'Dr. Rivera'
  },
  dark_humour: {
    image: darkHumourAvatar,
    glowColor: 'rgba(236, 72, 153, 0.6)', // Pink
    particleColor: '#ec4899',
    name: 'Ryder'
  }
};

interface AICoachAvatarProps {
  personality: PersonalityType;
  isThinking?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function AICoachAvatar({ personality, isThinking = false, size = 'medium' }: AICoachAvatarProps) {
  const config = AVATAR_CONFIG[personality];
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  // Generate random particles
  useEffect(() => {
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setParticles(newParticles);
  }, [personality]);

  const sizes = {
    small: 'w-16 h-16',
    medium: 'w-32 h-32',
    large: 'w-48 h-48'
  };

  const containerSizes = {
    small: 'w-20 h-20',
    medium: 'w-40 h-40',
    large: 'w-56 h-56'
  };

  // Personality-specific animations
  const getPersonalityAnimation = () => {
    switch (personality) {
      case 'military':
        // Aggressive shouting motion - make image bigger and shake vigorously
        return {
          scale: isThinking ? [1.15, 1.12, 1.15, 1.12, 1.15] : [1.1, 1.12, 1.1],
          rotate: isThinking ? [-5, 5, -5, 5, -5] : [-3, 3, -3],
          y: isThinking ? [-5, 5, -5, 5, -5] : [-3, 3, -3],
          x: isThinking ? [-3, 3, -3, 3, -3] : [-2, 2, -2],
          transition: {
            duration: isThinking ? 0.3 : 0.6,
            repeat: Infinity,
            ease: "easeInOut"
          }
        };
      case 'gym_bro':
        // Enthusiastic wave/bounce - energetic movement
        return {
          scale: isThinking ? [1.15, 1.2, 1.15, 1.2, 1.15] : [1.1, 1.15, 1.1],
          rotate: isThinking ? [0, -8, 8, -8, 8, 0] : [0, -5, 5, 0],
          y: isThinking ? [0, -8, 0, -8, 0] : [0, -5, 0],
          x: isThinking ? [-5, 0, 5, 0, -5] : [-3, 0, 3, 0],
          transition: {
            duration: isThinking ? 0.5 : 1,
            repeat: Infinity,
            ease: "easeInOut"
          }
        };
      case 'zen':
        // Gentle meditation breathing/sway - smooth and slow
        return {
          scale: [1.1, 1.12, 1.1, 1.12, 1.1],
          rotate: [0, -2, 0, 2, 0],
          y: [0, -4, 0, -4, 0],
          x: [-2, 0, 2, 0, -2],
          transition: {
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }
        };
      case 'clinical':
        // Thoughtful pondering with head tilt - analytical movement
        return {
          scale: isThinking ? [1.15, 1.12, 1.15, 1.12, 1.15] : [1.1, 1.12, 1.1],
          rotate: isThinking ? [-6, 6, -6, 6, 0] : [0, 4, 0, -4, 0],
          x: isThinking ? [0, 5, 0, -5, 0] : [0, 3, 0, -3, 0],
          y: isThinking ? [-3, 0, -3, 0, -3] : [-2, 0, -2, 0, -2],
          transition: {
            duration: isThinking ? 1.2 : 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }
        };
      case 'dark_humour':
        // Mischievous tilt and smirk - playful movement
        return {
          scale: isThinking ? [1.15, 1.18, 1.15, 1.18, 1.15] : [1.1, 1.13, 1.1],
          rotate: isThinking ? [0, 5, -5, 5, 0] : [0, 3, 0, -3, 0],
          y: isThinking ? [0, -4, 0, -4, 0] : [0, -3, 0],
          x: isThinking ? [3, -3, 3, -3, 0] : [2, -2, 2, 0],
          transition: {
            duration: isThinking ? 0.8 : 2,
            repeat: Infinity,
            ease: "easeInOut"
          }
        };
      default:
        return {
          scale: [1.1, 1.12, 1.1],
          transition: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }
        };
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      <div className={`relative ${containerSizes[size]}`}>
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full blur-xl"
          style={{ 
            background: `radial-gradient(circle, ${config.glowColor} 0%, transparent 70%)`,
          }}
          animate={{
            scale: isThinking ? [1, 1.2, 1] : [1, 1.1, 1],
            opacity: isThinking ? [0.6, 0.9, 0.6] : [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: isThinking ? 1.5 : 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Pulsing ring */}
        <motion.div
          className="absolute inset-2 rounded-full border-2"
          style={{ borderColor: config.particleColor }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Avatar image with personality-specific animation */}
        <div
          className={`relative ${sizes[size]} rounded-full overflow-hidden border-4 shadow-2xl`}
          style={{ borderColor: config.particleColor }}
        >
          <motion.img 
            src={config.image} 
            alt={config.name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            animate={getPersonalityAnimation()}
          />
          
          {/* Overlay glow effect */}
          <motion.div
            className="absolute inset-0"
            style={{ 
              background: `radial-gradient(circle at 30% 30%, ${config.glowColor}, transparent 60%)`,
            }}
            animate={{
              opacity: isThinking ? [0.3, 0.6, 0.3] : [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: isThinking ? 1.5 : 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        {/* Floating particles */}
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 rounded-full"
            style={{
              backgroundColor: config.particleColor,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          />
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <motion.div
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold shadow-lg"
            style={{ 
              backgroundColor: config.particleColor,
              color: 'white'
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            Thinking...
          </motion.div>
        )}
      </div>
    </div>
  );
}
