// Removes the previous build's files from the repository root before a new build.
// Only touches the generated "assets" folder; nothing else is deleted.
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const target = fileURLToPath(new URL('../../assets', import.meta.url));
rmSync(target, { recursive: true, force: true });
console.log('Cleared', target);
