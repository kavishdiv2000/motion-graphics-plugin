// Parse the three pipeline markdown files.
// Contract: YAML front matter between leading `---` fences holds global settings;
// every fenced ```yaml block in the body whose object has an `id` is a record
// (a scene in CHOREOGRAPHY.md, a beat in CONTENT.md). The nearest preceding
// markdown heading is kept as the record's human title.
import { readFileSync } from 'node:fs';
import YAML from 'yaml';

export function parseMd(text, file = '<md>') {
  const src = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  let frontmatter = {};
  let body = src;
  const fm = src.match(/^---\n([\s\S]*?)\n---\s*(\n|$)/);
  if (fm) {
    try {
      frontmatter = YAML.parse(fm[1]) || {};
    } catch (e) {
      throw new Error(`${file}: invalid YAML front matter — ${e.message}`);
    }
    body = src.slice(fm[0].length);
  }
  const records = [];
  const lines = body.split('\n');
  let heading = null;
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^(#{1,6})\s+(.*)$/);
    if (h) heading = h[2].trim();
    if (/^```ya?ml\s*$/.test(lines[i].trim())) {
      const start = i + 1;
      let j = start;
      while (j < lines.length && lines[j].trim() !== '```') j++;
      const chunk = lines.slice(start, j).join('\n');
      let obj;
      try {
        obj = YAML.parse(chunk);
      } catch (e) {
        throw new Error(`${file}: invalid YAML block under "${heading}" (line ${start + 1}) — ${e.message}`);
      }
      if (obj && typeof obj === 'object' && !Array.isArray(obj) && obj.id !== undefined) {
        records.push({ ...obj, id: String(obj.id), _heading: heading, _line: start });
      }
      i = j;
    }
  }
  // free-text sections (used to read "Raw content", "Core message", "Post copy")
  const sections = {};
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^##\s+(.*)$/);
    if (h) { cur = h[1].trim().toLowerCase(); sections[cur] = ''; continue; }
    if (cur) sections[cur] += line + '\n';
  }
  return { frontmatter, records, sections, body };
}

export function readMd(path) {
  return parseMd(readFileSync(path, 'utf8'), path);
}
