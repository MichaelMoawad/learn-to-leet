import type { Scene } from '../content/schema';

// Placeholder. The visual engine (SPEC section 3) replaces this.
export function Visual({ scenes, index }: { scenes: Scene[]; index: number }) {
  const scene = scenes[index];
  return (
    <div className="pixel-corners border-2 border-line bg-bg-1 p-6">
      <p className="label text-xs">Visual</p>
      <p className="mt-2 text-sm text-text-dim">
        Scene {index + 1} of {scenes.length}
        {scene ? `, ${scene.structures.length} structure(s)` : ''}. The visual engine renders here.
      </p>
      {scene?.caption && <p className="mt-2 font-mono text-sm">{scene.caption}</p>}
    </div>
  );
}

export default Visual;
