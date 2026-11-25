// tools/test-chart-tooltip.mjs
// Verifies CategoryBreakdownChart tooltip styles use CSS variables and that
// text color differs from background color in both light and dark themes.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadTsModule(filePath) {
  const resolvedPath = path.resolve(filePath);
  const src = fs.readFileSync(resolvedPath, 'utf8');
  const transpiled = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const mod = { exports: {} };
  const wrapper = vm.runInThisContext(
    `(function (exports, require, module, __filename, __dirname) { ${transpiled.outputText} \n})`,
    { filename: resolvedPath }
  );
  wrapper(mod.exports, require, mod, resolvedPath, path.dirname(resolvedPath));
  return mod.exports;
}

const { getCategoryTooltipStyles } = loadTsModule(path.resolve(rootDir, 'lib/chart-tooltip.ts'));
const styles = getCategoryTooltipStyles();

console.log('Running Chart Tooltip Styles Test...');

assert.equal(styles.contentStyle.backgroundColor, 'var(--color-surface-2)');
assert.equal(styles.contentStyle.color, 'var(--color-ink)');
assert.equal(styles.itemStyle.color, 'var(--color-ink)');
assert.equal(styles.labelStyle.color, 'var(--color-ink)');
assert.ok(styles.contentStyle.border.includes('var(--color-hairline)'));

// Verify in globals.css that --color-surface-2 and --color-ink resolve to distinct colors in both light and dark blocks
const globalsCss = fs.readFileSync(path.resolve(rootDir, 'app/globals.css'), 'utf8');
const surface2Matches = [...globalsCss.matchAll(/--color-surface-2:\s*(#[0-9A-Fa-f]{6})/g)].map((m) => m[1]);
const inkMatches = [...globalsCss.matchAll(/--color-ink:\s*(#[0-9A-Fa-f]{6})/g)].map((m) => m[1]);

assert.ok(surface2Matches.length >= 2, 'Expected light and dark --color-surface-2 hex definitions in globals.css');
assert.ok(inkMatches.length >= 2, 'Expected light and dark --color-ink hex definitions in globals.css');

for (let i = 0; i < 2; i++) {
  assert.notEqual(
    surface2Matches[i].toLowerCase(),
    inkMatches[i].toLowerCase(),
    `Theme ${i} tooltip background and ink colors must differ`
  );
}

console.log('✓ CategoryBreakdownChart tooltip styles and theme token contrast verified.');
