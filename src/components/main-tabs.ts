export const mainTabs = [
  { name: 'Notebook', icon: 'book', id: 'main-tab-notebook' },
  { name: 'Preferences', icon: 'tune', id: 'main-tab-preferences' },
] as const;

export type MainTab = typeof mainTabs[number]['name'];
export const mainTabPanelId = 'main-tab-panel';
