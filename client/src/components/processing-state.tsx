import { Brain } from "lucide-react";
import { motion } from "framer-motion";

export function ProcessingState() {
  return (
    <div className="p-6 text-center">
      <motion.div 
        className="bg-card rounded-xl shadow-lg p-8"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative w-16 h-16 mx-auto mb-4">
          {/* Animated pulse rings */}
          <motion.div
            className="absolute inset-0 rounded-full bg-purple-500/30"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-orange-500/30"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />
          
          {/* Brain icon */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-orange-500/20 rounded-full flex items-center justify-center"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Brain className="text-purple-600 h-8 w-8" />
          </motion.div>
        </div>

        <motion.h3 
          className="text-lg font-semibold mb-2" 
          data-testid="text-processing-title"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Analyzing your meal...
        </motion.h3>
        
        <motion.p 
          className="text-muted-foreground mb-4" 
          data-testid="text-processing-description"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Our AI is identifying food items and calculating nutrition
        </motion.p>
        
        <div className="w-full bg-muted rounded-full h-2 mb-2 overflow-hidden">
          <motion.div 
            className="bg-gradient-to-r from-purple-500 to-orange-500 h-2 rounded-full" 
            data-testid="progress-analysis"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{
              duration: 3,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
        </div>
        
        <motion.p 
          className="text-sm text-muted-foreground" 
          data-testid="text-processing-status"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          Processing image...
        </motion.p>
      </motion.div>
    </div>
  );
}
