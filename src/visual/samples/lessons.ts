// Every authored lesson's scenes as gallery samples (Two Sum first).
import { availableLessons } from '../../content';
import { scenesForLesson } from '../../lesson/scenes';
import type { Sample } from './types';

const samples: Sample[] = availableLessons().map((l) => ({ title: l.title, scenes: scenesForLesson(l) }));

export default samples;
