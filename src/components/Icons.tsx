// Small inline icons (no icon font, nothing to download).
type P = { size?: number }
const s = (size = 22) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true })

export const IconHome = ({ size }: P) => <svg {...s(size)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
export const IconStar = ({ size }: P) => <svg {...s(size)}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" /></svg>
export const IconHeart = ({ size }: P) => <svg {...s(size)}><path d="M12 20s-7-4.4-9.2-8.6C1.3 8.5 3 5 6.5 5c2 0 3.5 1.2 4.3 2.5h2.4C14 6.2 15.5 5 17.5 5 21 5 22.7 8.5 21.2 11.4 19 15.6 12 20 12 20z" /></svg>
export const IconBookmark = ({ size }: P) => <svg {...s(size)}><path d="M6 3h12v18l-6-4-6 4z" /></svg>
export const IconSettings = ({ size }: P) => <svg {...s(size)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
export const IconSearch = ({ size }: P) => <svg {...s(size ?? 20)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
