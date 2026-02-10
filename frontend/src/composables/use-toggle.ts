import type { MaybeRefOrGetter } from "vue";

export type ToggleDefault = {
  defaultVal: MaybeRefOrGetter<boolean>;
};

export const useToggle = ({ defaultVal = false }: Partial<ToggleDefault> = {}) => {
  const _isToggle = ref(toValue(defaultVal));
  const off = () => {
    _isToggle.value = false;
  };
  const on = () => {
    _isToggle.value = true;
  };
  const toggle = () => {
    _isToggle.value = !_isToggle.value;
  };

  return {
    isToggle: _isToggle,
    off,
    on,
    toggle,
  };
};
