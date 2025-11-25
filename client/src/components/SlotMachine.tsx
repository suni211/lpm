import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './SlotMachine.css';

const SlotMachine: React.FC = () => {
  const [symbols] = useState(['🎴', '⚔️', '🏆', '✨', '💎', '🎯', '🔥', '⭐']);
  const [currentSymbol, setCurrentSymbol] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSymbol((prev) => (prev + 1) % symbols.length);
    }, 100); // 빠르게 회전

    return () => clearInterval(interval);
  }, [symbols.length]);

  return (
    <div className="slot-machine">
      <div className="slot-frame">
        <div className="slot-window">
          <motion.div
            key={currentSymbol}
            className="slot-symbol"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            {symbols[currentSymbol]}
          </motion.div>
        </div>

        <div className="slot-glow"></div>
      </div>

      <div className="slot-lights">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="light"
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.125,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SlotMachine;
