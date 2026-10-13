#!/usr/bin/env node
// payload-guard: fails if the repository contains the "api.js / global.i" malware payload family.
// Usage:  node scripts/payload-guard.cjs --staged   (pre-commit: scans the staged/index content)
//         node scripts/payload-guard.cjs --tree     (pre-push / CI: scans every file in HEAD)
// Reads git objects only. Never executes anything from the repository.
const { execFileSync, spawnSync } = require('node:child_process');

const mode = process.argv.includes('--staged') ? 'staged' : 'tree';
const refIdx = process.argv.indexOf('--ref');
const REF = refIdx > 0 ? process.argv[refIdx + 1] : 'HEAD'; // --tree --ref origin/main scans any branch without checking it out
const SELF = new Set(['scripts/payload-guard.cjs', '.github/workflows/payload-guard.yml', 'docs/security/team-cleanup-plan.md']);

// Patterns are built from pieces so this file does not match itself.
const j = (...p) => new RegExp(p.join(''));
// 250+ spaces/tabs followed by visible code on the same line (the payload pads ~500; ordinary alignment stays well under). Linear scan (a regex backtracks quadratically here).
function hasPad(s) {
  let run = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 32 || c === 9) run++;
    else { if (run >= 250 && c !== 10 && c !== 13) return true; run = 0; }
  }
  return false;
}
const RULES = [
  ['loader variable',         j('global', '\\.i\\s*=\\s*[\'"]A\\d')],
  ['loader variable (_V)',    j('global\\[[\'"]', '_V', '[\'"]\\]')],
  ['obfuscated identifiers',  j('__0x', '[0-9a-f]{4,}')],
  ['api-loader script hook',        j('node ', 'api\\.js')],
  ['injected gitignore bait', j('temp_', '(auto|interactive)_push')],
  ['known C2 address',        j('193\\.247', '\\.144\\.38')],
  ['hidden padded line',      hasPad],
];
const TEXT = /\.(c?m?[jt]sx?|json|ya?ml|gitignore|php|py|sh|bat|cmd|ps1|toml|ini)$|(^|\/)(artisan|\.gitignore|Makefile|Dockerfile)$/i;
const SKIP = /(^|\/)(node_modules|vendor|dist|build|\.next|coverage|storage|public\/js)\/|\.min\.js$|(package-lock\.json|composer\.lock)$/;

const git = (args) => execFileSync('git', ['-c', 'core.fsmonitor=false', ...args], { encoding: 'buffer', maxBuffer: 1 << 28 });
const names = (mode === 'staged'
  ? git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])
  : git(['ls-tree', '-r', '-z', '--name-only', REF])).toString('utf8').split('\0').filter(Boolean);
const targets = names.filter((f) => !SELF.has(f) && TEXT.test(f) && !SKIP.test(f));
const prefix = mode === 'staged' ? ':' : REF + ':';

// Stream blobs from the object database (fast; no working-tree file I/O).
function* blobs(files) {
  for (let i = 0; i < files.length; i += 400) {
    const chunk = files.slice(i, i + 400);
    const out = spawnSync('git', ['cat-file', '--batch'], { input: chunk.map((f) => prefix + f).join('\n') + '\n', maxBuffer: 1 << 30 }).stdout;
    let pos = 0;
    for (const f of chunk) {
      const nl = out.indexOf(10, pos);
      const header = out.toString('utf8', pos, nl).split(' ');
      pos = nl + 1;
      if (header[1] !== 'blob') continue;
      const size = Number(header[2]);
      yield [f, out.subarray(pos, pos + size)];
      pos += size + 1;
    }
  }
}

const problems = [];
for (const [f, buf] of blobs(targets)) {
  if (buf.length > 1024 * 1024 || buf.includes(0)) continue;
  const text = buf.toString('utf8');
  for (const [name, re] of RULES) {
    // The padding rule only applies where the payload hides: source/config files, not prose or data.
    if (name === 'hidden padded line' && !/\.(c?m?[jt]sx?|json)$/i.test(f)) continue;
    if (typeof re === 'function' ? re(text) : re.test(text)) problems.push(`${f}: ${name}`);
  }
  // Config/loader files are short in real projects; a multi-thousand-char line there is the payload.
  if (/(\.config\.c?m?[jt]s|(^|\/)api\.js|(^|\/)\.eslintrc\.c?js)$/i.test(f)) {
    const longest = text.split('\n').reduce((m, l) => Math.max(m, l.length), 0);
    if (longest > 1500) problems.push(`${f}: unusually long line (${longest} chars)`);
  }
}

if (problems.length) {
  console.error('\nBLOCKED: possible malware payload found (' + mode + ' scan):\n  ' + [...new Set(problems)].join('\n  '));
  console.error('\nDo NOT bypass this. Tell the repo owner, and see docs/security/team-cleanup-plan.md.\n');
  process.exit(1);
}
console.log('payload-guard: clean (' + targets.length + ' files checked, ' + mode + ')');
