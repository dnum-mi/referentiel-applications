import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from "vue";

/** Garde le focus dans le dialogue si la désactivation du bouton de soumission le fait perdre. */
export function useSubmissionFocus(submitting: MaybeRefOrGetter<boolean>) {
  let origin: HTMLElement | null = null;
  let dialog: Element | null = null;
  let temporaryTarget: HTMLElement | null = null;
  const isSubmitting = () => toValue(submitting);
  const keepFocusInDialog = () => {
    if (!toValue(submitting) || !dialog?.isConnected || document.activeElement !== document.body) return;
    temporaryTarget = dialog.querySelector<HTMLElement>(".fr-btn--close");
    temporaryTarget?.focus();
  };
  const onSubmissionBlur = () => queueMicrotask(keepFocusInDialog);
  onScopeDispose(() => origin?.removeEventListener("blur", onSubmissionBlur));

  watch(
    isSubmitting,
    (busy) => {
      if (busy) {
        origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog = origin?.closest('dialog, [role="dialog"], [role="alertdialog"]') ?? null;
        temporaryTarget = null;
        origin?.addEventListener("blur", onSubmissionBlur, { once: true });
      } else {
        origin?.removeEventListener("blur", onSubmissionBlur);
      }
    },
    { flush: "sync" },
  );

  watch(
    isSubmitting,
    (busy) => {
      if (busy) {
        keepFocusInDialog();
        // Les navigateurs peuvent retirer le focus du bouton disabled après le rendu Vue.
        requestAnimationFrame(keepFocusInDialog);
        return;
      }

      if (
        origin?.isConnected &&
        origin !== document.body &&
        !origin.matches(":disabled") &&
        (document.activeElement === document.body || document.activeElement === temporaryTarget)
      ) {
        origin.focus();
      }
      origin = null;
      dialog = null;
      temporaryTarget = null;
    },
    { flush: "post" },
  );
}
