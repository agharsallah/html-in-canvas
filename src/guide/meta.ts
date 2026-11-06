/**
 * What the darkroom needs to know about the guide, without importing it.
 * The guide's content is a page of its own; linking to it must stay free.
 * `tests/guide-content.test.ts` keeps the count honest.
 */
export const GUIDE = {
  name: 'Field guide',
  href: 'guide.html',
  /** Number of concepts the guide explains (ENTRIES.length). */
  concepts: 25,
} as const;
