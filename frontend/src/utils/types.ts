export type Tab<E extends Record<string, string>> = {
  title: string
  icon: string
  tabId: `tab-${string}`
  panelId: `panel-${string}`
  disabled?: boolean
} & (
  | {
    loadFn: () => Promise<void>
    errorKey: keyof E
  }
  | {
    loadFn?: never
    errorKey?: never
  }
);
