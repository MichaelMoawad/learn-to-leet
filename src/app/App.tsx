import { AppRoutes } from './routes';
import { useMotionAttribute } from './useReducedMotion';

export default function App() {
  // Mirrors the effective motion setting to <html data-motion>. MotionConfig for animated
  // subtrees lives in MotionRoot, inside the lazily loaded lesson page.
  useMotionAttribute();
  return <AppRoutes />;
}
