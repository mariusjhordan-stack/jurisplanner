export const COURSE_COLOR_PALETTE = [
  { name: 'Lavanda', value: '#ead9ff', ink: '#604779' },
  { name: 'Durazno', value: '#fde4cf', ink: '#815536' },
  { name: 'Menta', value: '#dcecdf', ink: '#405c45' },
  { name: 'Rosa', value: '#f8dde5', ink: '#744654' },
  { name: 'Celeste', value: '#d9ebf4', ink: '#3d5a69' },
  { name: 'Mostaza', value: '#f4e9b8', ink: '#69591d' },
] as const;

export function getCourseColorStyle(color: string, seed: string) {
  const paletteColor = COURSE_COLOR_PALETTE.find((item) => item.value === color);
  const fallbackIndex = [...seed].reduce((sum, character) => sum + character.charCodeAt(0), 0) % COURSE_COLOR_PALETTE.length;
  const resolvedColor = paletteColor ?? COURSE_COLOR_PALETTE[fallbackIndex];
  return {
    backgroundColor: resolvedColor.value,
    color: resolvedColor.ink,
  };
}
