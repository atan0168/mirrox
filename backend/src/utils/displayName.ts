const LOWERCASE_WORDS = new Set(['and', 'of', 'with', 'in', '&']);
const MIN_ALIAS_LENGTH = 2;
const MIN_KEEP_SEGMENT = 3;

const normalizeWhitespace = (value: string): string =>
  value.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

const pickAlias = (aliases: readonly string[]): string | undefined => {
  const cleaned = aliases
    .map(a => a.trim())
    .filter(Boolean)
    .sort((a, b) => a.length - b.length);

  const viable = cleaned.find(a => a.length >= MIN_ALIAS_LENGTH);
  return viable;
};

const sanitizeRawName = (rawName: string): string => {
  const normalized = normalizeWhitespace(rawName);
  const segments = normalized
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  if (segments.length <= 1) return segments[0] ?? '';

  for (let i = segments.length - 1; i >= 0; i--) {
    if ((segments[i]?.length || 0) >= MIN_KEEP_SEGMENT) {
      return segments.slice(i).join(', ');
    }
  }

  return segments.join(', ');
};

// Capitalize words, keeping common short words lowercase except at the start.
export function titleize(value: string): string {
  const words = normalizeWhitespace(value.toLowerCase()).split(' ');

  const transformed = words.map((word, index) => {
    if (!word) return '';

    if (index > 0 && LOWERCASE_WORDS.has(word)) {
      return word;
    }

    return word[0]?.toUpperCase() + word.slice(1);
  });

  return transformed.filter(Boolean).join(' ');
}

type AliasInput = string | readonly string[] | undefined | null;

/** Produce a human-friendly display name from a raw name and optional aliases. */
export function prettyName(rawName: string, aliases?: AliasInput): string {
  const aliasList = Array.isArray(aliases)
    ? aliases
    : typeof aliases === 'string'
      ? [aliases]
      : [];

  const alias = pickAlias(aliasList);
  if (alias) return titleize(alias);

  const cleaned = sanitizeRawName(rawName || '');
  if (!cleaned) return '';

  const titled = titleize(cleaned);

  return titled.replace(/\s+,/g, ',').replace(/,\s+/g, ', ').trim();
}
