import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import Home from '../pages/Home';
import NotFound from '../pages/NotFound';

// The lesson page (visual engine, motion, sandbox) is its own chunk, so the home page stays light.
const LessonPage = lazy(() => import('../pages/LessonPage'));

// Dev only: the import sits behind the DEV check so production builds drop the gallery.
const DevVisuals = import.meta.env.DEV
  ? lazy(async () => {
      const [{ default: Page }, { MotionRoot }] = await Promise.all([import('../pages/DevVisuals'), import('./MotionRoot')]);
      return {
        default: () => (
          <MotionRoot>
            <Page />
          </MotionRoot>
        ),
      };
    })
  : null;

/** Shown for the moment the lesson chunk takes to arrive: an empty page in the right colours. */
function PageFallback() {
  return <div className="min-h-dvh" aria-busy="true" />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/learn/:slug"
        element={
          <Suspense fallback={<PageFallback />}>
            <LessonPage />
          </Suspense>
        }
      />
      {DevVisuals && (
        <Route
          path="/dev/visuals"
          element={
            <Suspense fallback={null}>
              <DevVisuals />
            </Suspense>
          }
        />
      )}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
