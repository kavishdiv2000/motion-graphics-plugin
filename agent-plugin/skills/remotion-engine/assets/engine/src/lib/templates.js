// Scene template registry — the single source of truth for which slots a template has,
// in what order they are revealed, and how each slot animates by default.
// Shared by: timeline.js (animation + audio cues), scripts/build.mjs (validation), React scenes (layout).

/**
 * Reveal types (how a text element enters):
 *  - glitch : RGB-split flicker-in of the whole element (labels, tags)
 *  - words  : word-by-word fade/blur/rise (setup and tail copy)
 *  - decode : per-character scramble that resolves into the real glyph (headlines)
 *  - type   : typewriter, one character at a time with a caret (lists, CTAs)
 *  - count  : numeric count-up from 0 (stats)
 *  - fade   : plain opacity/blur fade (logos, secondary info)
 *  - strike : words, then a strike-through line draws across (the "before" in compare)
 */
export const REVEALS = ['glitch', 'words', 'decode', 'type', 'count', 'fade', 'strike'];

/** Default reveal and typography role per slot. */
export const SLOT_DEFAULTS = {
  logo: { reveal: 'fade', role: 'logo' },
  label: { reveal: 'glitch', role: 'label' },
  setup: { reveal: 'words', role: 'setup' },
  headline: { reveal: 'decode', role: 'headline' },
  tail: { reveal: 'words', role: 'tail' },
  lines: { reveal: 'decode', role: 'line' },
  items: { reveal: 'type', role: 'item' },
  value: { reveal: 'count', role: 'stat' },
  before: { reveal: 'strike', role: 'setup' },
  after: { reveal: 'decode', role: 'headline' },
  cta: { reveal: 'type', role: 'cta' },
  parts: { reveal: 'words', role: 'setup' }, // per-part role decides the real default, see ROLE_REVEAL
};

/** Default reveal for a free-form `parts` entry, by its role. */
export const ROLE_REVEAL = { setup: 'words', tail: 'words', line: 'decode', headline: 'decode', item: 'type', cta: 'type', stat: 'count', label: 'glitch' };

/**
 * Templates. `slots` order == reveal order. `required` slots must be present in the content.
 * `accentSlot` is the slot that receives the scene accent colour when `emphasis.color` is set.
 */
export const TEMPLATES = {
  statement: {
    description: 'Tag + setup line + one decoded hero word/phrase + optional tail. The workhorse (demo scenes 1-5).',
    slots: ['label', 'setup', 'headline', 'tail'],
    required: ['headline'],
    accentSlot: 'headline',
  },
  title: {
    description: 'One oversized word or short phrase. Use for the hook frame or a section break.',
    slots: ['label', 'headline', 'tail'],
    required: ['headline'],
    accentSlot: 'headline',
    headlineScale: 1.35,
  },
  stack: {
    description: '2-4 short imperative lines that decode in sequence; the last line takes the accent (demo scene 6).',
    slots: ['label', 'lines'],
    required: ['lines'],
    accentSlot: 'lines:last',
  },
  stat: {
    description: 'A number that counts up, framed by a setup and a tail. Proof / data beats.',
    slots: ['label', 'setup', 'value', 'tail'],
    required: ['value'],
    accentSlot: 'value',
  },
  list: {
    description: '2-5 items typed in with a tick marker. Feature or step lists.',
    slots: ['label', 'setup', 'items'],
    required: ['items'],
    accentSlot: 'items:marker',
  },
  compare: {
    description: 'Old belief struck through, new belief decoded in accent. Reframe beats.',
    slots: ['label', 'before', 'after', 'tail'],
    required: ['before', 'after'],
    accentSlot: 'after',
  },
  sequence: {
    description: 'Free-form ordered parts, each with its own role (setup | line | headline | tail). For beats that alternate body and display copy (demo scenes 3 and 5).',
    slots: ['label', 'parts'],
    required: ['parts'],
    accentSlot: 'parts:accent',
  },
  endcard: {
    description: 'Logo + closing line + CTA. Always the final scene (demo scene 7).',
    slots: ['logo', 'label', 'setup', 'headline', 'tail', 'cta'],
    required: ['headline'],
    accentSlot: 'cta',
  },
};

export const TEMPLATE_NAMES = Object.keys(TEMPLATES);
