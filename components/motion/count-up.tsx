'use client';
// Numbers that count up when you scroll. Dani's idea. Stats feel bigger. They're not wrong.

import { useMotionValue, useTransform, animate, useInView } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface CountUpProps {
  target: number;
  duration?: number;
  className?: string;
}

export function CountUp({ target, duration = 1.2, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString());
  const isInView = useInView(ref, { once: true });
  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isInView) {
      const controls = animate(motionValue, target, { duration, ease: 'easeOut' });
      return controls.stop;
    }
  }, [isInView, motionValue, target, duration]);

  // Manually update the DOM to avoid re-renders on every frame
  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => {
      if (displayRef.current) {
        displayRef.current.textContent = v;
      }
    });
    return unsubscribe;
  }, [rounded]);

  return (
    <span ref={ref} className={className}>
      <span ref={displayRef}>0</span>
    </span>
  );
}
