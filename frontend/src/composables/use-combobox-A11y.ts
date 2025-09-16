import { computed } from "vue";
import type { Ref } from "vue";

export function useComboboxA11y(params: {
  id: string
  cssNamespace: string
  displayMenu: "inline" | "overlay"
  inputClasses?: string | null
  hintClasses?: string | null
  menuClasses?: string | null
  showAllValues: boolean
}, state: {
  focused: Ref<number | null>
  menuOpen: Ref<boolean>
}) {
  const assistiveHintID = computed(() => `${params.id}__assistiveHint`);

  const ariaProps = computed(() => ({
    "aria-describedby": assistiveHintID.value,
  }));

  const inputClassList = computed(() => {
    const base = `${params.cssNamespace}__input`;
    const list = [base, params.showAllValues ? `${base}--show-all-values` : `${base}--default`];
    if (state.focused.value !== null) list.push(`${base}--focused`);
    if (params.inputClasses) list.push(params.inputClasses);
    return list;
  });

  const menuClassList = computed(() => {
    const base = `${params.cssNamespace}__menu`;
    const list = [base, `${base}--${params.displayMenu}`, `${base}--${state.menuOpen.value ? "visible" : "hidden"}`];
    if (params.menuClasses) list.push(params.menuClasses);
    return list;
  });

  const computedMenuAttributes = computed(() => ({
    "aria-labelledby": params.id,
    id: `${params.id}__listbox`,
    role: "listbox",
    class: menuClassList.value.join(" "),
  }));

  return { assistiveHintID, ariaProps, inputClassList, menuClassList, computedMenuAttributes };
}
