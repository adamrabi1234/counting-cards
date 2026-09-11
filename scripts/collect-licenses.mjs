import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
const sections = ['Counting Cards — third-party software notices\nGenerated from installed production dependencies.\nCard artwork credits are provided separately in /cards/LICENSE.txt and /asset-credits.txt.'];
for (const [directory, metadata] of Object.entries(lock.packages).sort(([a], [b]) => a.localeCompare(b))) {
  if (!directory || metadata.dev) continue;
  const folder = path.join(root, directory);
  let names, pkg;
  try { names = await readdir(folder); pkg = JSON.parse(await readFile(path.join(folder, 'package.json'), 'utf8')); }
  catch { continue; }
  const licenses = names.filter(name => /^(licen[cs]e|copying|ofl)(\..*)?$/i.test(name));
  const texts = await Promise.all(licenses.map(name => readFile(path.join(folder, name), 'utf8').catch(() => '')));
  sections.push(`${pkg.name} ${pkg.version}\nDeclared license: ${pkg.license ?? metadata.license ?? 'See package source'}\n\n${texts.filter(Boolean).join('\n\n') || 'License notice is available in the package source.'}`);
}
await writeFile(path.join(root, 'public', 'third-party-notices.txt'), sections.join('\n\n' + '='.repeat(72) + '\n\n'));
console.log(`Collected notices for ${sections.length - 1} production packages.`);
