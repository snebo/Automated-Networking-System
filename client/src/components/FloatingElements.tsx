'use client';

import { useEffect, useState } from 'react';

interface FloatingElementsProps {
  count?: number;
}

export default function FloatingElements({ count = 20 }: FloatingElementsProps) {
  const [elements, setElements] = useState<Array<{
    id: number;
    size: number;
    duration: number;
    delay: number;
    left: number;
  }>>([]);

  useEffect(() => {
    const newElements = Array.from({ length: count }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2, // 2-6px
      duration: Math.random() * 20 + 10, // 10-30s
      delay: Math.random() * 10, // 0-10s
      left: Math.random() * 100, // 0-100%
    }));
    
    setElements(newElements);
  }, [count]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {elements.map((element) => (
        <div
          key={element.id}
          className="absolute rounded-full bg-gradient-to-r from-blue-400/10 to-purple-400/10 animate-float"
          style={{
            width: `${element.size}px`,
            height: `${element.size}px`,
            left: `${element.left}%`,
            animationDuration: `${element.duration}s`,
            animationDelay: `${element.delay}s`,
            top: '100%',
          }}
        />
      ))}
    </div>
  );
}