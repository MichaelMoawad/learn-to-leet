// Shared store contract (SPEC section 1, "Store shape"). localStorage key `ltl:v1`.
// 2A (site shell) owns this file and may extend it, but must keep these names and signatures:
// the sandbox (2B) depends on drafts, prefs.language, markSolved and progress[slug].solved.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '../content/schema';

export type MotionPref = 'auto' | 'reduced' | 'full';

export interface LessonProgress {
  step: number; // 1-based
  completed: boolean;
  solved: Partial<Record<Language, boolean>>;
}

export interface StoreState {
  progress: Record<string, LessonProgress>;
  drafts: Record<string, Partial<Record<Language, string>>>;
  prefs: { language: Language; motion: MotionPref };

  setStep(slug: string, step: number): void;
  markCompleted(slug: string): void;
  markSolved(slug: string, language: Language): void;
  setDraft(slug: string, language: Language, code: string): void; // callers debounce (500ms)
  clearDraft(slug: string, language: Language): void;
  setLanguage(language: Language): void;
  setMotion(motion: MotionPref): void;
}

const blank = (): LessonProgress => ({ step: 1, completed: false, solved: {} });

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      progress: {},
      drafts: {},
      prefs: { language: 'python', motion: 'auto' },

      setStep: (slug, step) =>
        set((s) => ({ progress: { ...s.progress, [slug]: { ...(s.progress[slug] ?? blank()), step } } })),
      markCompleted: (slug) =>
        set((s) => ({ progress: { ...s.progress, [slug]: { ...(s.progress[slug] ?? blank()), completed: true } } })),
      markSolved: (slug, language) =>
        set((s) => {
          const p = s.progress[slug] ?? blank();
          return { progress: { ...s.progress, [slug]: { ...p, solved: { ...p.solved, [language]: true } } } };
        }),
      setDraft: (slug, language, code) =>
        set((s) => ({ drafts: { ...s.drafts, [slug]: { ...s.drafts[slug], [language]: code } } })),
      clearDraft: (slug, language) =>
        set((s) => {
          const d = { ...s.drafts[slug] };
          delete d[language];
          return { drafts: { ...s.drafts, [slug]: d } };
        }),
      setLanguage: (language) => set((s) => ({ prefs: { ...s.prefs, language } })),
      setMotion: (motion) => set((s) => ({ prefs: { ...s.prefs, motion } })),
    }),
    { name: 'ltl:v1', version: 1, partialize: (s) => ({ progress: s.progress, drafts: s.drafts, prefs: s.prefs }) },
  ),
);
