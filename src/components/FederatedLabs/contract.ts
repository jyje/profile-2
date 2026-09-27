export type LabsScreen = {id: string; label: string};
export type LabsOptions = {
  locale: 'ko' | 'en';
  theme: 'light' | 'dark';
  onNavigationChange?: (screens: LabsScreen[]) => void;
};
export type LabsHandle = {
  update(options: LabsOptions): void;
  unmount(): void;
  navigate?(screenId: string): void;
};
export type LabsRemote = {contractVersion: number; mount(container: HTMLElement, options: LabsOptions): LabsHandle};

export function validScreens(value: unknown): value is LabsScreen[] {
  return Array.isArray(value) && value.every(screen => screen && typeof screen.id === 'string' && screen.id.trim()
    && typeof screen.label === 'string' && screen.label.trim()) && new Set(value.map(screen => screen.id)).size === value.length;
}
