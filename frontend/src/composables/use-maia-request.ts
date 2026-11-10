import { onScopeDispose, ref, watch, type WatchSource } from "vue";

/** Une fermeture ou un changement de contact invalide aussi les effets de fin de requête. */
export function useMaiaRequest(sources: WatchSource[]) {
  const isSyncing = ref(false);
  let version = 0;
  let disposed = false;
  function invalidate() {
    version++;
    isSyncing.value = false;
  }
  watch(sources, invalidate, { flush: "sync" });
  onScopeDispose(() => {
    disposed = true;
    invalidate();
  }, true);

  function begin() {
    if (disposed || isSyncing.value) return;
    const request = ++version;
    isSyncing.value = true;
    const isCurrent = () => request === version;
    return {
      isCurrent,
      finish: () => {
        if (isCurrent()) isSyncing.value = false;
      },
    };
  }
  return { isSyncing, begin, invalidate };
}
