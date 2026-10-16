// Jeu d'icônes inspiré d'Ionicons (utilisé dans l'app React Native), dessiné en SVG inline.
const P: Record<string, string> = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  bell: 'M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2ZM10 20a2 2 0 0 0 4 0',
  send: 'M4 12 20 4l-6 16-3-7-7-1Z M11 13l9-9',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 19h14',
  time: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2',
  home: 'M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8Z',
  swap: 'M4 8h14l-3-3M20 16H6l3 3',
  wallet: 'M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V7Zm0 0 11-3v3M16 13.5h.01',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  up: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5V8m-3.5 3.5L12 8l3.5 3.5',
  downc: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v8m-3.5-3.5L12 16l3.5-3.5',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4V8Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  check: 'M5 12.5 10 17l9-10',
  close: 'M6 6l12 12M18 6 6 18',
  finger: 'M7.5 10a4.5 4.5 0 0 1 9 0v3M5 12.5V10a7 7 0 0 1 13-3.6M19 10v3.5M12 10v5.5a6 6 0 0 1-1.5 4M9.5 12.5v2a4 4 0 0 1-1.2 3M14.5 12v3a8 8 0 0 1-.8 4',
  mail: 'M4 6h16v12H4V6Zm0 0 8 7 8-7',
  lock: 'M6 11h12v9H6v-9Zm2 0V8a4 4 0 0 1 8 0v3',
  login: 'M14 4h5v16h-5M3 12h11m-4-4 4 4-4 4',
  logout: 'M10 4H5v16h5m11-8H10m7-4 4 4-4 4',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.5 7.5 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.2-1.3L14.3 3h-4l-.4 2.4a7.6 7.6 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2.2 1.3l.4 2.4h4l.4-2.4a7.6 7.6 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3Z',
  people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 3 6',
  nfc: 'M7 7a7 7 0 0 1 0 10M10 9.5a3.5 3.5 0 0 1 0 5M13.5 4.5a11 11 0 0 1 0 15M17 3a13 13 0 0 1 0 18',
  shield: 'M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-4',
  alert: 'M12 3 2 20h20L12 3Zm0 6v5m0 3h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v6m0-9h.01',
  plus: 'M12 5v14M5 12h14',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4',
  back: 'M15 5l-7 7 7 7',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  convert: 'M7 4v13m0 0-3-3m3 3 3-3M17 20V7m0 0-3 3m3-3 3 3',
};

export function Icon({ name, size = 22, color = 'currentColor', stroke = 1.8 }: { name: keyof typeof P | string; size?: number; color?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={P[name] ?? P.info} />
    </svg>
  );
}
