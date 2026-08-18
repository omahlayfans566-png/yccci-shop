import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env';
import { uploadRoot } from '../config/upload';

export const productsDir = path.join(uploadRoot, 'products');

/** Generates a simple local SVG placeholder so the shop works fully offline. */
export function writeProductImage(name: string, hex: string, slug: string): string {
  fs.mkdirSync(productsDir, { recursive: true });
  const filename = path.join(productsDir, `${slug}.svg`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${hex}"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <text x="400" y="390" font-family="Segoe UI, Arial, sans-serif" font-size="34" fill="#ffffff" text-anchor="middle" font-weight="600">${escapeXml(name)}</text>
  <text x="400" y="440" font-family="Segoe UI, Arial, sans-serif" font-size="22" fill="#ffffff" opacity="0.75" text-anchor="middle">SHOP</text>
</svg>
`;
  fs.writeFileSync(filename, svg, 'utf-8');
  return `/uploads/products/${slug}.svg`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}