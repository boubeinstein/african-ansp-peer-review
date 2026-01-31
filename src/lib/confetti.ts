/**
 * Confetti celebration utilities using canvas-confetti
 */
import confetti from "canvas-confetti";

/**
 * Fire a celebration confetti burst from both sides of the screen
 * Used for major achievements like completing the onboarding tour
 */
export function fireCelebrationConfetti() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10001 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 50 * (timeLeft / duration);

    // Confetti from left side
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ["#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6"],
    });

    // Confetti from right side
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ["#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6"],
    });
  }, 250);
}

/**
 * Fire a simple success confetti burst from the center
 * Used for smaller achievements
 */
export function fireSuccessConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#22c55e", "#16a34a", "#15803d"],
    zIndex: 10001,
  });
}
