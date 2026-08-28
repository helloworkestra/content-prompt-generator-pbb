'use client';

import { useEffect } from 'react';

export const DEFAULT_BRANDING = {
  main_brand_color: '#2563eb',
  main_brand_color_name: '',
  text_main_color: '#111111',
  text_main_color_name: '',
  cta_button_color: '#111111',
  background_color: '#ffffff',
  background_color_name: '',
  secondary_bg_color: '#f7f7f8',
  secondary_bg_color_name: '',
  accent_color: '#e11d48',
  accent_color_name: '',
  soft_accent_color: '#fde68a',
  soft_accent_color_name: '',
  heading_font: 'Inter',
  body_font: 'Inter',
  subheading_font: 'Inter',
  accent_font: 'Inter',
};

export const GOOGLE_FONT_SUGGESTIONS = [
  'Inter',
  'Lora',
  'Playfair Display',
  'Montserrat',
  'Merriweather',
  'Poppins',
  'Roboto',
  'Open Sans',
  'Georgia',
  'Times New Roman',
];

// System fonts we shouldn't try to load from Google.
const SYSTEM_FONTS = new Set(['Georgia', 'Times New Roman', 'Arial', 'Helvetica']);

// Pick black or white text so a colored background stays readable.
export function pickContrastText(hex) {
  const m = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(hex || '').trim());
  if (!m) return '#ffffff';
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#111111' : '#ffffff';
}

export function fontStack(name) {
  if (!name) return 'inherit';
  return `"${name}", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
}

// Inject/refresh a single <link> tag loading the given font families from Google Fonts.
// Silently skips system fonts.
export function useGoogleFonts(fontNames) {
  const key = [...new Set(fontNames.filter(Boolean).filter((n) => !SYSTEM_FONTS.has(n)))]
    .sort()
    .join('|');

  useEffect(() => {
    if (typeof document === 'undefined' || !key) return;
    const families = key.split('|').map((n) => `family=${encodeURIComponent(n).replace(/%20/g, '+')}:wght@400;600;700`).join('&');
    const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;

    const id = 'ghl-google-fonts';
    let link = document.getElementById(id);
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
  }, [key]);
}
