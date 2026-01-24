"use client";

import { useEffect, useState } from "react";

interface Props {
  value: number;
  duration?: number;
}

export function AnimatedCounter({ value, duration = 1500 }: Props) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (value === 0) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{count}</span>;
}
