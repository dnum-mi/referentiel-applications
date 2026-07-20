import type { Directive, DirectiveBinding } from "vue";
import { useFeatureFlagStore } from "@/stores/featureFlagStore";

/**
 * Directive `v-feature="'ma-cle'"` : masque l'élément (retiré du flux, `hidden`)
 * si le flag est désactivé. On masque plutôt que de détacher le nœud pour rester
 * compatible avec le rendu de Vue et réversible si le flag bascule. Réévaluée au
 * montage et à chaque mise à jour du binding.
 */
function apply(el: HTMLElement, binding: DirectiveBinding<string>) {
  const store = useFeatureFlagStore();
  const enabled = store.isEnabled(binding.value);
  el.style.display = enabled ? "" : "none";
  el.hidden = !enabled;
}

export const vFeature: Directive<HTMLElement, string> = {
  mounted: apply,
  updated: apply,
};
