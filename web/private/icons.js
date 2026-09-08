const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.7"/><rect x="14" y="3" width="7" height="7" rx="1.7"/><rect x="3" y="14" width="7" height="7" rx="1.7"/><rect x="14" y="14" width="7" height="7" rx="1.7"/>',
  star: '<path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.6l6.2-.9z"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  refresh:
    '<path d="M20 7a8 8 0 0 0-14-2L3 8m0-5v5h5M4 17a8 8 0 0 0 14 2l3-3m0 5v-5h-5"/>',
  sliders:
    '<path d="M4 21v-7m0-6V3m8 18v-5m0-6V3m8 18v-9m0-6V3M1 11h6m2 2h6m2-4h6"/>',
  shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6zM8.5 12l2.5 2.5 4.5-5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4m0 3h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  merge: '<path d="M7 3v5c0 4 5 3 5 7m5-12v5c0 4-5 3-5 7v6m-4-4 4 4 4-4"/>',
  split:
    '<path d="M12 21v-6c0-4-6-3-6-7V3m6 12c0-4 6-3 6-7V3M3 6l3-3 3 3m6 0 3-3 3 3"/>',
  compress:
    '<path d="M3 8h5V3m0 5L2 2m14 1v5h5m-5 0 6-6M3 16h5v5m0-5-6 6m14-1v-5h5m-5 0 6 6"/>',
  edit: '<path d="M12 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-7M16 3l5 5M10 14l1-5 7-7 5 5-7 7z"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
  "image-out":
    '<path d="M21 12V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7M3 17l6-6 4 4m2 3h7m-3-3 3 3-3 3"/><circle cx="8" cy="7" r="1"/>',
  rotate: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  "file-out": '<path d="M13 3H5v18h14v-7M13 3v6h6l-6-6m1 9h8m-3-3 3 3-3 3"/>',
  file: '<path d="M14 2H5v20h14V7zM14 2v6h5M8 12h8m-8 4h5"/>',
  presentation:
    '<path d="M3 3h18v13H3zM12 16v5m-4 0 4-3 4 3M7 12l3-4 3 2 4-4"/>',
  stamp:
    '<path d="M8 14c0-4 1-3 1-7a3 3 0 0 1 6 0c0 4 1 3 1 7M5 14h14v5H5zm1 8h12"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  unlock:
    '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7-2m-3 10v2"/>',
  pen: '<path d="m3 17 1 4 4-1L21 7l-5-5L3 15zm10-12 5 5M3 21h18"/>',
  hash: '<path d="m9 3-2 18M17 3l-2 18M3 8h18M2 16h18"/>',
  crop: '<path d="M6 3v15h15M3 6h15v15"/>',
  scan: '<path d="M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5M8 8h8m-4 0v8m-3 0h6"/>',
  "arrow-left": '<path d="M20 12H4m6-6-6 6 6 6"/>',
};
export function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
}
