#!/usr/bin/env node
// Regenerate the sound-design skill's SFX catalogue from the code (single source of truth).
//   node scripts/sfx-docs.mjs <output.md>
import { writeFileSync } from 'node:fs';
import { SFX } from './lib/sfx.mjs';
const out = process.argv[2] || 'sfx-catalogue.md';
const cats = { ui: 'UI / clicks', data: 'Data / digital', glitch: 'Glitch / signal', transition: 'Transitions', impact: 'Impacts', musical: 'Musical / brand', texture: 'Beds / texture (loopable)' };
let md = `# SFX catalogue — ${Object.keys(SFX).length} procedural sounds\n\nGenerated from \`scripts/lib/sfx.mjs\` by \`scripts/sfx-docs.mjs\` — the recipe shown for each sound IS the code that synthesises it\n(helpers: \`transient(sr,dur,bandHz,Q,decayTau,seed,color)\` = band-passed noise burst with exponential decay;\n\`blip(sr,dur,f0,f1,tau,wave)\` = oscillator gliding f0→f1 with exponential decay; all other functions are in \`scripts/lib/dsp.mjs\`).\nAudition them all: \`npm run sfx\` → \`public/sfx/_reel.wav\`.\n`;
for (const [c, title] of Object.entries(cats)) {
  const ids = Object.entries(SFX).filter(([, v]) => v.cat === c);
  md += `\n## ${title} (${ids.length})\n\n| id | sound | use it for |\n|---|---|---|\n` + ids.map(([id, v]) => `| \`${id}\` | ${v.desc} | ${v.use} |`).join('\n') + '\n';
  for (const [id, v] of ids) md += `\n<details><summary><code>${id}</code> recipe</summary>\n\n\`\`\`js\n${v.make.toString().replace(/\s+/g, ' ').replace(/; /g, ';\n  ')}\n\`\`\`\n</details>\n`;
}
writeFileSync(out, md);
console.log(`✔ ${out}`);
