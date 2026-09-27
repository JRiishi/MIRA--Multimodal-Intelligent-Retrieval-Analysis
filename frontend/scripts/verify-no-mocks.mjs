/**
 * Production leak gate.
 *
 * Scans the built `dist/` output and fails the build if ANY mock artefact is
 * present. This is the machine-checkable guarantee that the shipped bundle is
 * never wired to the local Mock Service Worker.
 *
 * Wired as `postbuild`, so `npm run build` cannot succeed while mocks leak.
 * Run standalone with: `npm run verify:no-mocks`
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const distDir = join(projectRoot, 'dist');

/**
 * Tokens that can only originate from the mock layer. Each one is a module
 * path, a plugin name, a response header, or a route table entry that exists
 * only in `src/mocks/` or the dev-only Vite plugin.
 */
const FORBIDDEN_MARKERS = [
  // Current transport: dev-server middleware.
  'createMockApi',
  'mira-mock-api',
  'mocks/store',
  'X-Mock-Source',
  'mira-dev-middleware',
  'mockApiPlugin',
  // Previous transport, kept so a regression to MSW is still caught.
  'mockServiceWorker',
  'setupWorker',
  'onUnhandledRequest',
  'mswjs',
  'msw/browser',
  'msw/lib',
  'VITE_USE_MOCK',
];

/** Filenames that must never be emitted into the build output. */
const FORBIDDEN_FILENAMES = ['mockServiceWorker.js'];

/** Only these extensions can carry executable or injected code. */
const SCANNED_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.css', '.html', '.json', '.map']);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function fail(message) {
  console.error(`\n[verify:no-mocks] FAIL — ${message}\n`);
  process.exit(1);
}

if (!existsSync(distDir)) {
  fail(`dist/ not found at ${relative(projectRoot, distDir)}. Run \`vite build\` first.`);
}

const files = walk(distDir);
const violations = [];

for (const file of files) {
  const rel = relative(projectRoot, file);
  const name = file.split(/[\\/]/).pop() ?? '';

  if (FORBIDDEN_FILENAMES.includes(name)) {
    violations.push({ rel, marker: 'forbidden filename' });
    continue;
  }

  if (!SCANNED_EXTENSIONS.has(extname(file))) continue;

  const contents = readFileSync(file, 'utf8');
  for (const marker of FORBIDDEN_MARKERS) {
    if (contents.includes(marker)) {
      violations.push({ rel, marker });
    }
  }
}

if (violations.length > 0) {
  console.error('\n[verify:no-mocks] FAIL — mock code detected in production build:\n');
  for (const { rel, marker } of violations) {
    console.error(`  ${rel}  ->  contains "${marker}"`);
  }
  console.error(
    '\n  The mock layer must never ship. See frontend/README.md "Tearing down the mock layer".\n',
  );
  process.exit(1);
}

console.log(`[verify:no-mocks] PASS — ${files.length} files scanned in dist/, 0 mock artefacts found.`);
