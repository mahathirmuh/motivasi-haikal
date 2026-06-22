// Copies bundled assets out of node_modules into /public so they are served
// at runtime without an external CDN. Runs automatically on `npm install`
// (postinstall). Failures are non-fatal — the app degrades gracefully.
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const copies = [
  {
    from: 'node_modules/three/examples/fonts/helvetiker_bold.typeface.json',
    to: 'public/assets/fonts/helvetiker_bold.typeface.json',
  },
];

for (const c of copies) {
  try {
    const from = join(root, c.from);
    const to = join(root, c.to);
    if (existsSync(from)) {
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(from, to);
      console.log('[copy-assets] copied ->', c.to);
    } else {
      console.warn('[copy-assets] source missing (skipped):', c.from);
    }
  } catch (err) {
    console.warn('[copy-assets] warning:', err.message);
  }
}
