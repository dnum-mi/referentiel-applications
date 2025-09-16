export function useComboboxKeyboard(ctx: {
  menuOpen: () => boolean
  optionsLen: () => number
  focused: () => number | null
  selected: () => number
  query: () => string
  setFocused: (i: number | null) => void
  setSelected: (i: number) => void
  openAll: () => void
  search: () => void
  close: () => void
  submitSearch: () => void
  selectAndConfirmAt: (i: number, e?: KeyboardEvent) => void
  blurComponent: () => void
  focusInput: () => void
}) {
  const PAGE_SIZE = 5;

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  function moveSelection(delta: number) {
    const len = ctx.optionsLen();
    if (!len) return;
    const current = clamp(ctx.selected(), -1, len - 1);
    const next = clamp(current + delta, 0, len - 1);
    ctx.setSelected(next);
    ctx.setFocused(next);
  }

  function handleUp(e: KeyboardEvent) {
    if (e.altKey && ctx.menuOpen()) {
      e.preventDefault();
      ctx.close();
      return;
    }
    if (ctx.menuOpen()) {
      e.preventDefault();
      moveSelection(-1);
    }
  }

  function handleDown(e: KeyboardEvent) {
    if (e.altKey) {
      e.preventDefault();
      if (!ctx.menuOpen()) {
        if (ctx.query() === "") ctx.openAll();
        else ctx.search();
      }
      return;
    }

    if (!ctx.menuOpen()) {
      if (ctx.query() === "") ctx.openAll();
      else ctx.search();
      return;
    }

    e.preventDefault();
    moveSelection(+1);
  }

  function handleHome(e: KeyboardEvent) {
    if (ctx.menuOpen() && ctx.optionsLen()) {
      e.preventDefault();
      ctx.setSelected(0); ctx.setFocused(0);
    }
  }

  function handleEnd(e: KeyboardEvent) {
    const len = ctx.optionsLen();
    if (ctx.menuOpen() && len) {
      e.preventDefault();
      ctx.setSelected(len - 1); ctx.setFocused(len - 1);
    }
  }

  function handlePageUp(e: KeyboardEvent) {
    if (!ctx.menuOpen()) return;
    e.preventDefault();
    moveSelection(-PAGE_SIZE);
  }

  function handlePageDown(e: KeyboardEvent) {
    if (!ctx.menuOpen()) return;
    e.preventDefault();
    moveSelection(+PAGE_SIZE);
  }

  function handleSpace(e: KeyboardEvent) {
    const f = ctx.focused();
    if (ctx.menuOpen() && f != null && f >= 0) {
      e.preventDefault();
      ctx.selectAndConfirmAt(f, e);
    }
  }

  function handleEnter(e: KeyboardEvent) {
    if (ctx.menuOpen()) {
      e.preventDefault();
      const s = ctx.selected();
      if (s >= 0) ctx.selectAndConfirmAt(s, e);
      else ctx.submitSearch();
    } else {
      ctx.submitSearch();
    }
  }

  function handleEscape(e: KeyboardEvent) {
    if (ctx.menuOpen()) {
      e.preventDefault();
      ctx.close();
      return;
    }
    ctx.blurComponent();
  }

  function handleCtrlP(e: KeyboardEvent) {
    if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && ctx.menuOpen()) {
      e.preventDefault();
      moveSelection(-1);
    }
  }
  function handleCtrlN(e: KeyboardEvent) {
    if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && ctx.menuOpen()) {
      e.preventDefault();
      moveSelection(+1);
    }
  }

  function onKeydown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();

    if (key === "p" && e.ctrlKey) return handleCtrlP(e);
    if (key === "n" && e.ctrlKey) return handleCtrlN(e);

    switch (key) {
      case "arrowup": return handleUp(e);
      case "arrowdown": return handleDown(e);
      case "home": return handleHome(e);
      case "end": return handleEnd(e);
      case "pageup": return handlePageUp(e);
      case "pagedown": return handlePageDown(e);
      case " ": return handleSpace(e);
      case "enter": return handleEnter(e);
      case "escape": return handleEscape(e);
      default:
        if (key.length === 1) ctx.focusInput();
    }
  }

  return { onKeydown };
}
