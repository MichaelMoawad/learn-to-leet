import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import Home from '../pages/Home';
import LessonPage from '../pages/LessonPage';
import NotFound from '../pages/NotFound';

// Dev only: the import sits behind the DEV check so production builds drop the gallery.
const DevVisuals = import.meta.env.DEV ? lazy(() => import('../pages/DevVisuals')) : null;

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/learn/:slug" element={<LessonPage />} />
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
