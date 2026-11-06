/** Greg: a heavyset guy in a flat ascot cap. */
export function Greg({ size = '100%', title = 'Greg' }: { size?: number | string; title?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title} className="greg-art">
      <title>{title}</title>
      {/* Jacket and shirt */}
      <path d="M8 100 C8 74 26 64 50 64 C74 64 92 74 92 100 Z" fill="#4a5d7e" />
      <path d="M38 66 L50 84 L62 66 Z" fill="#f4f1ea" />
      <path d="M47 70 L50 90 L53 70 Z" fill="#a33a3a" />
      {/* Ears */}
      <ellipse cx="24" cy="50" rx="5" ry="7" fill="#e9b893" />
      <ellipse cx="76" cy="50" rx="5" ry="7" fill="#e9b893" />
      {/* Chin and head */}
      <ellipse cx="50" cy="64" rx="17" ry="7" fill="#e3ad86" />
      <ellipse cx="50" cy="49" rx="26" ry="23" fill="#f2c7a3" />
      {/* Cheeks */}
      <circle cx="35" cy="56" r="5" fill="#f0a08a" opacity="0.6" />
      <circle cx="65" cy="56" r="5" fill="#f0a08a" opacity="0.6" />
      {/* Eyes and brows */}
      <circle cx="41" cy="48" r="2.6" fill="#2b2118" />
      <circle cx="59" cy="48" r="2.6" fill="#2b2118" />
      <path d="M36 42 Q41 39 46 42" stroke="#7a5a3c" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M54 42 Q59 39 64 42" stroke="#7a5a3c" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Nose and smile */}
      <ellipse cx="50" cy="53" rx="3.5" ry="2.8" fill="#e3a07e" />
      <path d="M41 59 Q50 66 59 59" stroke="#7a3b2e" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Flat cap */}
      <path d="M23 40 C22 23 40 18 54 19 C70 20 79 28 78 38 Z" fill="#8b6b4a" />
      <path d="M30 31 Q50 24 72 30" stroke="#6f5338" strokeWidth="1.5" fill="none" />
      <path d="M50 37 C62 34 78 34 88 41 C78 45 62 44 50 41 Z" fill="#6f5338" />
      <circle cx="51" cy="20" r="2" fill="#6f5338" />
    </svg>
  );
}
