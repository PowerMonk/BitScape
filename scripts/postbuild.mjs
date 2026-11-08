/**
 * Post-build: inline the CSS and the JS bundle into dist/index.html so the
 * game runs from a plain double-click (file://) as well as from any static
 * server. No external requests, no CORS problems, one portable file.
 */
import { readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const htmlPath = join(dist, 'index.html');

let html = await readFile(htmlPath, 'utf8');

// --- CSS -----------------------------------------------------------------
const cssMatch = html.match(/<link rel="stylesheet" href="[^"]*\.css">/);
if (!cssMatch) throw new Error('postbuild: stylesheet link not found');
const cssHref = cssMatch[0].match(/href="([^"]+)"/)[1];
const cssFile = join(dist, cssHref.replace(/^\.?\//, ''));
const css = await readFile(cssFile, 'utf8');
html = html.replace(cssMatch[0], `<style>${css}</style>`);

// --- JS ------------------------------------------------------------------
const jsMatch = html.match(/<script type="module" src="[^"]*\.js"><\/script>/);
if (!jsMatch) throw new Error('postbuild: module script tag not found');
const jsHref = jsMatch[0].match(/src="([^"]+)"/)[1];
const jsFile = join(dist, jsHref.replace(/^\.?\//, ''));
const js = (await readFile(jsFile, 'utf8')).replace(/<\/script/gi, '<\\/script');
// The bundle contains no ESM syntax, so a classic script is safe (and is
// the only thing that works from file:// in every browser).
html = html.replace(jsMatch[0], `<script>${js}</script>`);

// --- sanity checks -------------------------------------------------------
if (html.includes('rel="stylesheet"') || html.includes('type="module"')) {
  throw new Error('postbuild: external references remain in index.html');
}

await writeFile(htmlPath, html, 'utf8');
await rm(join(dist, '_astro'), { recursive: true, force: true });

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
console.log(`postbuild: inlined CSS + JS → dist/index.html (${kb(Buffer.byteLength(html))})`);
