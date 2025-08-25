export interface AvatarProps {
  head: 'oval' | 'round';
  eyes: 'happy' | 'tired' | 'neutral';
  body: 'default' | 'athletic';
  skinTone?: number; // -1 to 1, where negative is darker and positive is lighter
  // Add other customizable parts as needed
}
