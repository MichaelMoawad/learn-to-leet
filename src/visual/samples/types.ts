import type { Scene } from '../../content/schema';

/** A named sequence of scenes for the /dev/visuals gallery. */
export interface Sample {
  title: string;
  scenes: Scene[];
}
