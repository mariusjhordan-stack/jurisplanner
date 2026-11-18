export function animateCompletion(element: HTMLElement | null): void {
  if (
    !element
    || typeof window === 'undefined'
    || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    || typeof element.animate !== 'function'
  ) {
    return;
  }

  const animation = element.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.025)' },
      { transform: 'scale(1)' },
    ],
    { duration: 260, easing: 'ease-out' },
  );
  animation.onfinish = () => animation.cancel();
}
