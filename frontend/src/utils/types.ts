export type Tab<E extends Record<string, string>> = {
  title: string
  icon: string
  tabId: `tab-${string}`
  panelId: `panel-${string}`
  disabled?: boolean
} & (
  | {
    loadFn: () => Promise<any>
    errorKey: keyof E
  }
  | {
    loadFn?: never
    errorKey?: never
  }
);

type GenericHeaders = {
  key: string
  label: string
}[];

export type GenericRow<H extends GenericHeaders> = Record<(H)[number]["key"], any> & { id: string };
