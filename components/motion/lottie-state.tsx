'use client';

import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

type AnimationName = 'empty-signals' | 'empty-competitors' | 'empty-dossier' | 'loading-ai' | 'success-check';

const animationImports: Record<AnimationName, () => Promise<{ default: object }>> = {
  'empty-signals': () => import('@/public/lottie/empty-signals.json'),
  'empty-competitors': () => import('@/public/lottie/empty-competitors.json'),
  'empty-dossier': () => import('@/public/lottie/empty-dossier.json'),
  'loading-ai': () => import('@/public/lottie/loading-ai.json'),
  'success-check': () => import('@/public/lottie/success-check.json'),
};

interface LottieStateProps {
  name: AnimationName;
  loop?: boolean;
  className?: string;
  size?: number;
}

export function LottieState({ name, loop = true, className, size = 200 }: LottieStateProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    animationImports[name]()
      .then((mod) => setAnimationData(mod.default || mod))
      .catch(() => {
        // Lottie file not found — fail silently
      });
  }, [name]);

  if (!animationData) return null;

  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
