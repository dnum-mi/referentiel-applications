<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from "vue";
import PaginationFooter from "@/components/PaginationFooter.vue";
import { sbomApi, sbomDate, sbomErrorMessage, type SbomComponent, type SbomImportDetail, type SbomSource } from "@/services/sbom";
import SbomImport from "./SbomImport.vue";
import SbomChanges from "./SbomChanges.vue";
import SbomSourceHistory from "./SbomSourceHistory.vue";

const props = defineProps<{ applicationId: string; canEdit: boolean }>();
const uid = useId();
const sources = ref<SbomSource[]>([]);
const components = ref<SbomComponent[]>([]);
const total = ref(0);
const page = ref(0);
const pageSize = ref(15);
const searchInput = ref("");
const search = ref("");
const loading = ref(false);
const error = ref("");
const actionError = ref("");
const statusMessage = ref("");
const actionBusy = ref(false);
const removal = ref<{ source: SbomSource; removed: number; revision: number } | null>(null);
const detail = ref<SbomImportDetail | null>(null);
const detailPage = ref(0);
const detailPageSize = ref(20);
const relationPage = ref(0);
const relationPageSize = ref(20);
const detailHeading = ref<HTMLElement | null>(null);
const confirmationHeading = ref<HTMLElement | null>(null);
const actionErrorElement = ref<HTMLElement | null>(null);
const inventoryHeading = ref<HTMLElement | null>(null);
let trigger: HTMLElement | null = null;
let context = 0;
let readSequence = 0;
let actionSequence = 0;
let readController: AbortController | undefined;
let actionController: AbortController | undefined;

const detailComponents = computed(
  () => detail.value?.components.slice(detailPage.value * detailPageSize.value, (detailPage.value + 1) * detailPageSize.value) ?? [],
);
const detailRelations = computed(
  () => detail.value?.relations.slice(relationPage.value * relationPageSize.value, (relationPage.value + 1) * relationPageSize.value) ?? [],
);

function invalidate() {
  context++;
  readSequence++;
  actionSequence++;
  readController?.abort();
  actionController?.abort();
}

async function load() {
  readController?.abort();
  readController = new AbortController();
  const request = ++readSequence;
  const currentContext = context;
  loading.value = true;
  error.value = "";
  try {
    const [sourceList, inventory] = await Promise.all([
      sbomApi.sources(props.applicationId, readController.signal),
      sbomApi.components(props.applicationId, { page: page.value, pageSize: pageSize.value, search: search.value }, readController.signal),
    ]);
    if (request !== readSequence || currentContext !== context) return;
    sources.value = sourceList;
    components.value = inventory.results;
    total.value = inventory.total;
    statusMessage.value = `${inventory.total} composants dans l’inventaire SBOM.`;
  } catch (cause) {
    if (request !== readSequence || currentContext !== context) return;
    components.value = [];
    sources.value = [];
    total.value = 0;
    error.value = sbomErrorMessage(cause);
  } finally {
    if (request === readSequence && currentContext === context) loading.value = false;
  }
}

watch(
  () => [props.applicationId, props.canEdit],
  () => {
    invalidate();
    components.value = [];
    sources.value = [];
    total.value = 0;
    page.value = 0;
    searchInput.value = "";
    search.value = "";
    removal.value = null;
    detail.value = null;
    actionError.value = "";
    statusMessage.value = "";
    actionBusy.value = false;
    void load();
  },
  { immediate: true, flush: "sync" },
);
onBeforeUnmount(invalidate);

async function changePage(value: number) {
  page.value = value;
  await load();
}

async function changePageSize(value: number) {
  pageSize.value = value;
  await changePage(0);
}

async function applySearch() {
  search.value = searchInput.value.trim();
  await changePage(0);
}

async function refreshAfterImport() {
  detail.value = null;
  removal.value = null;
  await changePage(0);
}

function beginAction(event?: Event) {
  actionController?.abort();
  actionController = new AbortController();
  const request = ++actionSequence;
  const currentContext = context;
  if (event?.currentTarget instanceof HTMLElement) trigger = event.currentTarget;
  actionBusy.value = true;
  actionError.value = "";
  return { signal: actionController.signal, isCurrent: () => request === actionSequence && currentContext === context };
}

async function showActionError(cause: unknown) {
  actionError.value = sbomErrorMessage(cause);
  await nextTick();
  actionErrorElement.value?.focus();
}

async function showDetail(importId: string, event: Event) {
  if (actionBusy.value) return;
  const action = beginAction(event);
  detail.value = null;
  removal.value = null;
  try {
    const result = await sbomApi.detail(props.applicationId, importId, action.signal);
    if (!action.isCurrent()) return;
    detail.value = result;
    detailPage.value = 0;
    relationPage.value = 0;
    await nextTick();
    detailHeading.value?.focus();
  } catch (cause) {
    if (action.isCurrent()) await showActionError(cause);
  } finally {
    if (action.isCurrent()) actionBusy.value = false;
  }
}

async function previewDeactivation(source: SbomSource, event: Event) {
  if (!props.canEdit || actionBusy.value) return;
  const action = beginAction(event);
  detail.value = null;
  removal.value = null;
  try {
    const result = await sbomApi.previewDeactivation(props.applicationId, source, action.signal);
    if (!action.isCurrent()) return;
    removal.value = { source, ...result };
    await nextTick();
    confirmationHeading.value?.focus();
  } catch (cause) {
    if (action.isCurrent()) await showActionError(cause);
  } finally {
    if (action.isCurrent()) actionBusy.value = false;
  }
}

async function closeAction() {
  actionSequence++;
  actionController?.abort();
  actionBusy.value = false;
  detail.value = null;
  removal.value = null;
  actionError.value = "";
  await nextTick();
  if (trigger?.isConnected && !trigger.matches(":disabled")) trigger.focus();
  else inventoryHeading.value?.focus();
}

async function deactivate() {
  if (!removal.value || !props.canEdit || actionBusy.value) return;
  const source = { id: removal.value.source.id, revision: removal.value.revision };
  const sourceName = removal.value.source.name;
  const action = beginAction();
  try {
    await sbomApi.deactivate(props.applicationId, source, action.signal);
    if (!action.isCurrent()) return;
    removal.value = null;
    await changePage(0);
    if (!action.isCurrent()) return;
    statusMessage.value = `Source ${sourceName} désactivée. Son historique est conservé.`;
    await nextTick();
    inventoryHeading.value?.focus();
  } catch (cause) {
    if (!action.isCurrent()) return;
    removal.value = null;
    await showActionError(cause);
  } finally {
    if (action.isCurrent()) actionBusy.value = false;
  }
}

function importStatus(value: string) {
  return value === "unchanged" ? "Vérification sans changement" : value === "committed" ? "Import confirmé" : "Analyse";
}

function componentContext(value: SbomImportDetail["components"][number]["context"]) {
  if (value === "provenance") return "Provenance uniquement — hors inventaire courant";
  if (value === "excluded") return "Composant exclu — hors inventaire courant";
  return "Composant de l’inventaire déclaré";
}
</script>

<template>
  <section :aria-labelledby="`${uid}-title`" class="fr-mt-5w" data-testid="sbom-inventory">
    <h3 :id="`${uid}-title`" ref="inventoryHeading" tabindex="-1">Dépendances importées par SBOM</h3>
    <p>Inventaire déclaré par les sources actives. Les différentes versions et les composants à identifier restent consultables.</p>
    <SbomImport :application-id="applicationId" :can-edit="canEdit" :sources="sources" @imported="refreshAfterImport" />
    <p class="fr-sr-only" role="status" aria-live="polite" aria-atomic="true">{{ statusMessage }}</p>
    <div v-if="error" role="alert" class="fr-alert fr-alert--error fr-mb-2w">
      <p>{{ error }}</p>
      <button type="button" class="fr-btn fr-btn--secondary" @click="load">Réessayer le chargement de l’inventaire</button>
    </div>
    <div v-if="actionError" ref="actionErrorElement" role="alert" tabindex="-1" class="fr-alert fr-alert--error fr-mb-2w">
      {{ actionError }}
    </div>
    <form class="fr-search-bar fr-mb-2w" role="search" :aria-label="'Rechercher dans les composants SBOM'" @submit.prevent="applySearch">
      <label :for="`${uid}-search`" class="fr-label">Rechercher un composant SBOM</label>
      <input :id="`${uid}-search`" v-model="searchInput" type="search" class="fr-input" placeholder="Produit, version ou identifiant" />
      <button type="submit" class="fr-btn" :disabled="loading">Rechercher</button>
    </form>
    <p v-if="loading" role="status">Chargement de l’inventaire…</p>
    <template v-else-if="!error">
      <p>{{ total }} composants{{ search ? " correspondant à la recherche" : " dans les sources actives" }}.</p>
      <div v-if="components.length" class="fr-table fr-table--bordered">
        <div class="fr-table__wrapper">
          <div class="fr-table__container">
            <div class="fr-table__content">
              <table>
                <caption>
                  Composants logiciels importés
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Technologie</th>
                    <th scope="col">Produit</th>
                    <th scope="col">Version</th>
                    <th scope="col">Identification</th>
                    <th scope="col">Provenance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="component in components" :key="component.id">
                    <td>{{ component.technology || "Autre" }}</td>
                    <td>
                      {{ component.product
                      }}<span class="fr-hint-text">{{ component.ecosystem || component.type || "Type non précisé" }}</span>
                    </td>
                    <td>{{ component.version || "Non renseignée" }}</td>
                    <td>
                      <span v-if="component.identificationStatus === 'incomplete'">Identification à compléter</span
                      ><span v-else>Identifié</span
                      ><span v-if="component.purl" class="fr-hint-text sbom-reference">{{ component.purl }}</span
                      ><span v-else class="fr-hint-text">PURL non renseigné</span>
                    </td>
                    <td>SBOM · {{ component.sourceName }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <p v-else>Aucun composant à afficher.</p>
      <PaginationFooter
        v-if="total > 0"
        :total-filtered="total"
        :page="page"
        :limit="pageSize"
        @update:page="changePage"
        @update:limit="changePageSize"
      />
      <h4 class="fr-mt-3w">Sources et historique</h4>
      <p v-if="!sources.length">Aucune source SBOM enregistrée.</p>
      <div v-for="source in sources" :key="source.id" class="fr-callout fr-mb-2w">
        <h5>{{ source.name }} — {{ source.active ? "Active" : "Inactive" }}</h5>
        <p v-if="source.context">{{ source.context }}</p>
        <p>{{ source.componentCount }} composants · Révision {{ source.revision }} · Mise à jour : {{ sbomDate(source.updatedAt) }}</p>
        <button
          v-if="canEdit && source.active"
          type="button"
          class="fr-btn fr-btn--secondary fr-mb-2w"
          :disabled="actionBusy"
          @click="previewDeactivation(source, $event)"
        >
          Prévisualiser la désactivation de {{ source.name }}
        </button>
        <SbomSourceHistory :application-id="applicationId" :source="source" :disabled="actionBusy" @inspect="showDetail" />
      </div>
    </template>
    <section v-if="removal && canEdit" class="fr-callout" :aria-labelledby="`${uid}-deactivate`" :aria-busy="actionBusy">
      <h4 :id="`${uid}-deactivate`" ref="confirmationHeading" tabindex="-1">Désactiver la source {{ removal.source.name }}</h4>
      <p>
        {{ removal.removed }} composants seront retirés de l’inventaire courant de cette source. Les autres sources, les données manuelles
        et l’historique seront conservés.
      </p>
      <div class="fr-btns-group fr-btns-group--inline-md">
        <button type="button" class="fr-btn" :disabled="actionBusy" @click="deactivate">Confirmer la désactivation</button>
        <button type="button" class="fr-btn fr-btn--secondary" :disabled="actionBusy" @click="closeAction">Annuler la désactivation</button>
      </div>
    </section>
    <section v-if="detail" class="fr-callout" :aria-labelledby="`${uid}-detail`">
      <h4 :id="`${uid}-detail`" ref="detailHeading" tabindex="-1">Import de {{ detail.sourceName }} du {{ sbomDate(detail.createdAt) }}</h4>
      <p>{{ detail.format }} {{ detail.specVersion }} · {{ importStatus(detail.status) }} · {{ detail.totalComponents }} composants</p>
      <ul v-if="detail.warnings.length">
        <li v-for="(warning, index) in detail.warnings" :key="index">{{ warning }}</li>
      </ul>
      <SbomChanges :changes="detail.changes" />
      <h5>Composants de cet import</h5>
      <p>
        Les éléments de provenance et les composants exclus sont conservés pour consultation. Seuls les composants de l’inventaire déclaré
        alimentent l’inventaire courant lorsque cette source est active.
      </p>
      <ul>
        <li v-for="component in detailComponents" :key="component.ref" class="sbom-reference">
          {{ component.product }} · {{ component.version || "Version non renseignée" }} · {{ component.ref
          }}<span v-if="component.identificationStatus === 'incomplete'"> · Identification à compléter</span>
          <span class="fr-hint-text">{{ componentContext(component.context) }}</span>
        </li>
      </ul>
      <PaginationFooter
        v-if="detail.components.length > 20"
        :total-filtered="detail.components.length"
        :page="detailPage"
        :limit="detailPageSize"
        @update:page="detailPage = $event"
        @update:limit="
          detailPageSize = $event;
          detailPage = 0;
        "
      />
      <h5 class="fr-mt-2w">Relations déclarées</h5>
      <p v-if="!detail.relations.length">
        Aucune relation déclarée dans cet import. L’absence de relation ne prouve pas l’absence de dépendance.
      </p>
      <ul v-else>
        <li v-for="(relation, index) in detailRelations" :key="index" class="sbom-reference">
          {{ relation.from }} → {{ relation.to }} ({{ relation.type }})<span v-if="!relation.resolved">
            — référence externe non résolue</span
          >
        </li>
      </ul>
      <PaginationFooter
        v-if="detail.relations.length > 20"
        :total-filtered="detail.relations.length"
        :page="relationPage"
        :limit="relationPageSize"
        @update:page="relationPage = $event"
        @update:limit="
          relationPageSize = $event;
          relationPage = 0;
        "
      />
      <button type="button" class="fr-btn fr-btn--secondary fr-mt-2w" @click="closeAction">Fermer le détail de l’import</button>
    </section>
  </section>
</template>

<style scoped>
.sbom-reference {
  overflow-wrap: anywhere;
}
</style>
