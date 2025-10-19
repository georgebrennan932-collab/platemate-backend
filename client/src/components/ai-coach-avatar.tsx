import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import militaryVideo from "@assets/1760859782981_1760865007751.mp4";
import gymBroVideo from "@assets/1760859862860_1760865007770.mp4";
import zenVideo from "@assets/1760860089731_1760865007735.mp4";
import clinicalVideo from "@assets/1760860104807_1760865007708.mp4";
import darkHumourVideo from "@assets/1760860192581_1760865007745.mp4";

export type PersonalityType = 'military' | 'gym_bro' | 'zen' | 'clinical' | 'dark_humour';

interface AvatarConfig {
  video: string;
  glowColor: string;
  particleColor: string;
  name: string;
}

const AVATAR_CONFIG: Record<PersonalityType, AvatarConfig> = {
  military: {
    video: militaryVideo,
    glowColor: 'rgba(239, 68, 68, 0.6)', // Red
    particleColor: '#ef4444',
    name: 'Sergeant Stone'
  },
  gym_bro: {
    video: gymBroVideo,
    glowColor: 'rgba(34, 197, 94, 0.6)', // Green
    particleColor: '#22c55e',
    name: 'Coach Mike'
  },
  zen: {
    video: zenVideo,
    glowColor: 'rgba(168, 85, 247, 0.6)', // Purple
    particleColor: '#a855f7',
    name: 'Maya'
  },
  clinical: {
    video: clinicalVideo,
    glowColor: 'rgba(6, 182, 212, 0.6)', // Cyan
    particleColor: '#06b6d4',
    name: 'Dr. Rivera'
  },
  dark_humour: {
    video: darkHumourVideo,
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

// Large animation stage for selected personality
interface ActivePersonalityStageProps {
  personality: PersonalityType;
  isThinking?: boolean;
}

export function ActivePersonalityStage({ personality, isThinking = false }: ActivePersonalityStageProps) {
  const config = AVATAR_CONFIG[personality];
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  // Generate random particles
  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setParticles(newParticles);
  }, [personality]);

  // Amplified personality-specific animations for visibility
  const getStageAnimation = () => {
    switch (personality) {
      case 'military':
        // Aggressive shouting motion - vigorous shaking
        return {
          rotate: isThinking ? [-8, 8, -8, 8, -8] : [-4, 4, -4],
          y: isThinking ? [-25, 25, -25, 25, -25] : [-15, 15, -15],
          x: isThinking ? [-15, 15, -15, 15, -15] : [-8, 8, -8],
          scale: isThinking ? [1, 1.05, 1, 1.05, 1] : [1, 1.02, 1],
          transition: {
            duration: isThinking ? 0.3 : 0.6,
            repeat: Infinity,
            ease: "easeInOut"
          }
        };
      case 'gym_bro':
        // Enthusiastic wave/bounce - energetic movement
        return {
          rotate: isThinking ? [0, -12, 12, -12, 12, 0] : [0, -8, 8, 0],
          y: isThinking ? [0, -30, 0, -30, 0] : [0, -20, 0],
          x: isThinking ? [-20, 0, 20, 0, -20] : [-12, 0, 12, 0],
          scale: isThinking ? [1, 1.1, 1, 1.1, 1] : [1, 1.05, 1],
          transition: {
            duration: isThinking ? 0.5 : 1,
            repeat: Infinity,
            ease: "easeInOut"
          }
        };
      case 'zen':
        // Gentle meditation breathing/sway - smooth and slow
        return {
          rotate: [0, -3, 0, 3, 0],
          y: [0, -15, 0, -15, 0],
          x: [-8, 0, 8, 0, -8],
          scale: [1, 1.03, 1, 1.03, 1],
          transition: {
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }
        };
      case 'clinical':
        // Thoughtful pondering with head tilt - analytical movement
        return {
          rotate: isThinking ? [-10, 10, -10, 10, 0] : [0, 6, 0, -6, 0],
          x: isThinking ? [0, 20, 0, -20, 0] : [0, 12, 0, -12, 0],
          y: isThinking ? [-12, 0, -12, 0, -12] : [-8, 0, -8, 0, -8],
          scale: isThinking ? [1, 1.04, 1, 1.04, 1] : [1, 1.02, 1],
          transition: {
            duration: isThinking ? 1.2 : 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }
        };
      case 'dark_humour':
        // Mischievous tilt and smirk - playful movement
        return {
          rotate: isThinking ? [0, 8, -8, 8, 0] : [0, 5, 0, -5, 0],
          y: isThinking ? [0, -18, 0, -18, 0] : [0, -12, 0],
          x: isThinking ? [15, -15, 15, -15, 0] : [10, -10, 10, 0],
          scale: isThinking ? [1, 1.06, 1, 1.06, 1] : [1, 1.03, 1],
          transition: {
            duration: isThinking ? 0.8 : 2,
            repeat: Infinity,
            ease: "easeInOut"
          }
        };
      default:
        return {
          scale: [1, 1.03, 1],
          transition: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }
        };
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-lg">
      <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center">
        {/* Animated background glow */}
        <motion.div
          className="absolute inset-0 rounded-3xl opacity-30"
          style={{ 
            background: `radial-gradient(circle, ${config.glowColor}, transparent 70%)`,
          }}
          animate={{
            scale: isThinking ? [1, 1.2, 1] : [1, 1.1, 1],
            opacity: isThinking ? [0.3, 0.5, 0.3] : [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: isThinking ? 1.5 : 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Main avatar with amplified animation */}
        <div
          className="relative w-64 h-64 md:w-80 md:h-80 rounded-3xl overflow-hidden border-4 shadow-2xl"
          style={{ borderColor: config.particleColor }}
        >
          <video 
            src={config.video} 
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
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
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: config.particleColor,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              y: [0, -40, 0],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
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
            className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full text-sm font-semibold shadow-lg"
            style={{ 
              backgroundColor: config.particleColor,
              color: 'white'
            }}
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            Thinking...
          </motion.div>
        )}
      </div>

      {/* Personality name */}
      <motion.h3 
        className="mt-6 text-2xl md:text-3xl font-bold"
        style={{ color: config.particleColor }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {config.name}
      </motion.h3>
    </div>
  );
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

  // Personality-specific animations (disabled for small thumbnails)
  const getPersonalityAnimation = () => {
    // No animations for small thumbnails to avoid visual conflict
    if (size === 'small') {
      return {};
    }

    switch (personality) {
      case 'military':
        // Aggressive shouting motion - vigorous shaking
        return {
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
          rotate: isThinking ? [0, -8, 8, -8, 8, 0] : [0, -5, 5, 0],
          y: isThinking ? [0, -8, 0, -8, 0] : [0, -5, 0],
          x: isThinking ? [-5, 0, 5, 0, -5] : [-3, 0, 3, 0],
          scale: isThinking ? [1, 1.05, 1, 1.05, 1] : [1, 1.03, 1],
          transition: {
            duration: isThinking ? 0.5 : 1,
            repeat: Infinity,
            ease: "easeInOut"
          }
        };
      case 'zen':
        // Gentle meditation breathing/sway - smooth and slow
        return {
          rotate: [0, -2, 0, 2, 0],
          y: [0, -4, 0, -4, 0],
          x: [-2, 0, 2, 0, -2],
          scale: [1, 1.01, 1, 1.01, 1],
          transition: {
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }
        };
      case 'clinical':
        // Thoughtful pondering with head tilt - analytical movement
        return {
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
          rotate: isThinking ? [0, 5, -5, 5, 0] : [0, 3, 0, -3, 0],
          y: isThinking ? [0, -4, 0, -4, 0] : [0, -3, 0],
          x: isThinking ? [3, -3, 3, -3, 0] : [2, -2, 2, 0],
          scale: isThinking ? [1, 1.03, 1, 1.03, 1] : [1, 1.02, 1],
          transition: {
            duration: isThinking ? 0.8 : 2,
            repeat: Infinity,
            ease: "easeInOut"
          }
        };
      default:
        return {
          scale: [1, 1.02, 1],
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
          <video 
            src={config.video} 
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
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
