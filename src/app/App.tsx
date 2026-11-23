import { MotionConfig } from 'motion/react';
import { AppRoutes } from './routes';
import { useMotionAttribute } from './useReducedMotion';
import { useStore } from './store';

export default function App() {
  const reduced = useMotionAttribute();
  const pref = useStore((s) => s.prefs.motion);
  // 'full' forces animation even if the OS asks for less; otherwise follow the effective setting.
  const reducedMotion = reduced ? 'always' : pref === 'full' ? 'never' : 'user';
  return (
    <MotionConfig reducedMotion={reducedMotion}>
      <AppRoutes />
    </MotionConfig>
  );
}
