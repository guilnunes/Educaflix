// Copia content/ (dados JSON e mídias) para dist/content/, para o build estático
// do GitHub Pages mostrar todo o conteúdo gerado.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const from = path.join(root, 'content');
const to = path.join(root, 'dist', 'content');

fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true, filter: (src) => !src.endsWith('.tmp') });
console.log(`Conteúdo copiado para ${path.relative(root, to)}`);
