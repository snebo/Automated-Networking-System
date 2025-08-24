'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  animation?: 'fadeInUp' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn' | 'slideInUp';
  delay?: number;
}

export default function AnimatedSection({ 
  children, 
  className = '', 
  animation = 'fadeInUp',
  delay = 0 
}: AnimatedSectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    
    const handleChange = () => setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    // Skip animations on mobile or when user prefers reduced motion
    const isMobile = window.innerWidth < 768;
    if (reducedMotion || isMobile) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [delay, reducedMotion]);

  const getAnimationClass = () => {
    // Skip animations on mobile or when user prefers reduced motion
    if (reducedMotion || (typeof window !== 'undefined' && window.innerWidth < 768)) {
      return 'opacity-100';
    }
    
    const baseClass = 'transition-all duration-700 ease-out';
    
    switch (animation) {
      case 'fadeInUp':
        return `${baseClass} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`;
      case 'fadeInLeft':
        return `${baseClass} ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`;
      case 'fadeInRight':
        return `${baseClass} ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`;
      case 'scaleIn':
        return `${baseClass} ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-98'}`;
      case 'slideInUp':
        return `${baseClass} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`;
      default:
        return `${baseClass} ${isVisible ? 'opacity-100' : 'opacity-0'}`;
    }
  };

  return (
    <div 
      ref={ref} 
      className={`${getAnimationClass()} ${className}`}
    >
      {children}
    </div>
  );
}