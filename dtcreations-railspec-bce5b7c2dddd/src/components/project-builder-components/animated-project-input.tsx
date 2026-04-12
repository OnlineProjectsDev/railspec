"use client";

import { ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AnimatedProjectInputProps {
  showInput: boolean;
  projectName: string;
  isTransitioning: boolean;
  onGetStarted: () => void;
  onSubmit: () => void;
  onProjectNameChange: (value: string) => void;
}

export default function AnimatedProjectInput({
  showInput,
  projectName,
  isTransitioning,
  onGetStarted,
  onSubmit,
  onProjectNameChange,
}: AnimatedProjectInputProps) {
  return (
    <div className="flex justify-center gap-4">
      <motion.div 
        className="w-full flex gap-2"
        initial={false}
        animate={{ 
          justifyContent: showInput ? 'flex-center' : 'center',
        }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ 
            width: showInput ? 'calc(100% - 152px)' : 0,
            opacity: showInput ? 1 : 0,
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="overflow-visible flex items-center relative z-0"
          style={{ originX: 1 }}
        >
          <motion.input
            id="projectName"
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && projectName.trim() && !isTransitioning) {
                onSubmit();
              }
            }}
            initial={{ x: '100%' }}
            animate={{ x: showInput ? '0%' : '100%' }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            placeholder="e.g., Marina Village Deck"
            className="w-full px-4 py-2 text-xs border-2 border-gray-300 rounded-md focus:outline-none focus:border-rail-light-blue"
            autoFocus={showInput}
            disabled={isTransitioning}
          />
        </motion.div>
        
        <motion.button
          onClick={showInput ? onSubmit : onGetStarted}
          disabled={showInput && !projectName.trim()}
          className="w-[140px] flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2 cursor-pointer text-xs bg-rail-light-blue text-white rounded-md hover:bg-[#333] transition-colors duration-300 font-medium group disabled:bg-gray-300 disabled:cursor-not-allowed relative z-10"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={showInput ? 'continue' : 'get-started'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {showInput ? 'Continue' : 'Get Started'}
            </motion.span>
          </AnimatePresence>
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </motion.div>
    </div>
  );
}
