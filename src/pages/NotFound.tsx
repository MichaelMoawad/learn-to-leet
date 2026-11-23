import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button3D } from '../ui/Button3D';
import { Panel } from '../ui/Panel';
import { Leet } from '../mascot/Leet';
import { clientNav } from '../app/nav';

export default function NotFound() {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = 'Page not found | Learn to Leet';
    return () => {
      document.title = 'Learn to Leet';
    };
  }, []);
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-16">
      <Panel className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
        <Leet pose="oops" scale={4} />
        <div>
          <p className="label text-xs text-red">Error 404</p>
          <h1 className="mt-2 font-display text-xl font-semibold">Index out of range</h1>
          <p className="mt-2 text-text-dim">There is nothing at this address. The lessons are this way.</p>
          <div className="mt-5">
            <Button3D href="/" onClick={clientNav(navigate, '/')}>
              All lessons
            </Button3D>
          </div>
        </div>
      </Panel>
    </main>
  );
}
