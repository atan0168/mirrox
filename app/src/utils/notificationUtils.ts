export function truncate(str: string, max = 120): string {
  if (str.length <= max) return str;
  const slice = str.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 60 ? slice.slice(0, lastSpace) : slice).trimEnd() + '…';
}
