// A 16x16 pixel icon (SPEC 5.3) drawn at an integer scale through PixelSprite.
import { useMemo } from 'react';
import { iconPalette, icons, type IconName } from './icons';
import { PixelSprite } from './PixelSprite';

/** A 16x16 pixel icon drawn at an integer scale, coloured by `color` (default currentColor). */
export function Icon({ name, scale = 1, color = 'currentColor', title }: { name: IconName; scale?: 1 | 2 | 3; color?: string; title?: string }) {
  const palette = useMemo(() => iconPalette(color), [color]);
  return <PixelSprite frame={icons[name]} palette={palette} scale={scale} title={title} className="shrink-0" />;
}

export default Icon;
