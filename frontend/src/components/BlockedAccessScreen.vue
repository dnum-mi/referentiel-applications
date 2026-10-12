<script setup lang="ts">
import { routeNames } from "@/router/route-names";
import { useRouter } from "vue-router";
import { nextTick, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps<{
  active: boolean;
}>();

const router = useRouter();
const dialog = ref<HTMLDialogElement | null>(null);
let previousFocus: HTMLElement | null = null;

function focusLogout() {
  dialog.value?.querySelector<HTMLButtonElement>("[data-testid=blocked-access-logout-btn]")?.focus();
}

function restoreFocus() {
  if (previousFocus?.isConnected) previousFocus.focus();
  previousFocus = null;
}

watch(
  () => props.active,
  async (active) => {
    if (!active) {
      dialog.value?.close();
      restoreFocus();
      return;
    }
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    if (!props.active || !dialog.value) return;
    if (!dialog.value.open) dialog.value.showModal();
    focusLogout();
  },
  { immediate: true, flush: "post" },
);

function keepFocus(event: KeyboardEvent) {
  if (event.key !== "Tab") return;
  event.preventDefault();
  focusLogout();
}

onBeforeUnmount(() => {
  dialog.value?.close();
  restoreFocus();
});

function logout() {
  router.push({ name: routeNames.LOGOUT });
}
</script>

<template>
  <Teleport to="body">
    <dialog
      v-if="active"
      ref="dialog"
      class="blocked-access-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="blocked-access-title"
      aria-describedby="blocked-access-description"
      data-testid="blocked-access-screen"
      @cancel.prevent
      @keydown="keepFocus"
    >
      <div class="fr-container">
        <div class="fr-alert fr-alert--error" data-testid="blocked-access-alert">
          <h1 id="blocked-access-title" class="fr-alert__title">Votre accès a été bloqué</h1>
          <p id="blocked-access-description">
            Un administrateur a bloqué votre accès au Référentiel des Applications. Contactez un administrateur si vous pensez qu'il s'agit
            d'une erreur.
          </p>
        </div>
        <DsfrButton label="Se déconnecter" class="fr-mt-3w" data-testid="blocked-access-logout-btn" @click="logout" />
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.blocked-access-overlay {
  position: fixed;
  inset: 0;
  margin: 0;
  border: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  z-index: 2000;
  align-items: center;
  justify-content: center;
  background-color: var(--background-default-grey);
}
.blocked-access-overlay[open] {
  display: flex;
}
</style>
