export const BREAKPOINTS = {
  MOBILE_MAX: 767,
  TABLET_MAX: 1024,
  SMALL_CARD_MAX: 599,
  ACTIONS_STACK_MAX: 420,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;
