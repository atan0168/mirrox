import { useCallback, useMemo } from 'react';
import { useAvatarStore } from '../store/avatarStore';

/**
 * useAvatarAnimation
 * Convenience hook wrapping the avatar animation related slice of the zustand store.
 * Provides a stable API for components and future abstraction/refactoring.
 */
export function useAvatarAnimation() {
  const activeAnimation = useAvatarStore(s => s.activeAnimation);
  const isManualAnimation = useAvatarStore(s => s.isManualAnimation);
  const sleepMode = useAvatarStore(s => s.sleepMode);

  const setActiveAnimation = useAvatarStore(s => s.setActiveAnimation);
  const resetAnimations = useAvatarStore(s => s.resetAnimations);
  const clearManualAnimation = useAvatarStore(s => s.clearManualAnimation);
  const setSleepMode = useAvatarStore(s => s.setSleepMode);

  // Derived state helpers
  const isSleepingEnforced = sleepMode && !isManualAnimation;
  const hasActiveAnimation = !!activeAnimation;

  const playAnimation = useCallback(
    (name: string | null, opts: { manual?: boolean } = { manual: true }) => {
      setActiveAnimation(name, opts);
    },
    [setActiveAnimation]
  );

  const stopAnimation = useCallback(() => {
    // Stop current animation but keep manual flag logic consistent
    setActiveAnimation(null, { manual: false });
    clearManualAnimation();
  }, [setActiveAnimation, clearManualAnimation]);

  const api = useMemo(
    () => ({
      // Raw state
      activeAnimation,
      isManualAnimation,
      sleepMode,
      // Derived
      isSleepingEnforced,
      hasActiveAnimation,
      // Actions
      playAnimation,
      stopAnimation,
      resetAnimations,
      clearManualAnimation,
      setSleepMode,
      setActiveAnimation,
    }),
    [
      activeAnimation,
      isManualAnimation,
      sleepMode,
      isSleepingEnforced,
      hasActiveAnimation,
      playAnimation,
      stopAnimation,
      resetAnimations,
      clearManualAnimation,
      setSleepMode,
      setActiveAnimation,
    ]
  );

  return api;
}

export type UseAvatarAnimationReturn = ReturnType<typeof useAvatarAnimation>;
