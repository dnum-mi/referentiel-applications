<script setup lang="ts">
import { ref, computed, watch } from "vue";
import Applications from "@/api/application";
import type { Application, Actor } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import { defineProps, defineEmits } from "vue";

const toaster = useToaster();

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
  title: { type: String, default: "" },
  icon: { type: String, default: "" },
});

const emit = defineEmits(["update:application"]);

const localActors = ref<Actor[]>(Array.isArray(props.application.actors) ? [...props.application.actors] : []);

watch(
  () => props.application.actors,
  (newVal) => {
    localActors.value = Array.isArray(newVal) ? [...newVal] : [];
  },
);

const actorTypeMapping: Record<string, string> = {
  Responsable: "Responsable",
  Exploitation: "Exploitation",
  ResponsableAutre: "Autre responsable",
  Hebergement: "Hébergement",
  ArchitecteApplicatif: "Architecte Applicatif",
  ArchitecteInfra: "Architecte Infra",
  RepresentantSSI: "Représentant SSI",
  Autre: "Autre",
};

const actorTypeOptions = computed(() => [
  { value: "", text: "choisir un type d'acteur" },
  ...Object.entries(actorTypeMapping).map(([key, label]) => ({
    value: key,
    text: label,
  })),
]);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const loading = ref(false);

const hasChanges = computed(() => JSON.stringify(localActors.value) !== JSON.stringify(props.application.actors));

const selectedActorIds = ref<string[]>([]);

function addActor() {
  localActors.value.push({
    id: Date.now().toString(),
    email: "",
    actorType: "",
    applicationId: props.application.id,
  });
  console.log("Nombre d'acteurs après ajout :", localActors.value.length);
}

function removeActor(actorId: string) {
  localActors.value = localActors.value.filter((actor) => actor.id !== actorId);
}

function removeSelectedActors() {
  localActors.value = localActors.value.filter((actor) => !selectedActorIds.value.includes(actor.id));
  selectedActorIds.value = [];
}

function cancelChanges() {
  localActors.value = Array.isArray(props.application.actors) ? [...props.application.actors] : [];
}

async function saveAll() {
  for (const actor of localActors.value) {
    if (!actor.email.trim()) {
      toaster.addErrorMessage("L'email est requis pour tous les acteurs.");
      return;
    }
    if (!isValidEmail(actor.email)) {
      toaster.addErrorMessage("Veuillez entrer une adresse email valide pour tous les acteurs.");
      return;
    }
  }

  const existingIds = new Set((props.application.actors || []).map((a: Actor) => a.id));
  const actorsToSave = localActors.value.map((actor) => (existingIds.has(actor.id) ? actor : { ...actor, id: undefined }));

  loading.value = true;
  try {
    const updatedApplication = await Applications.patchApplication({
      ...props.application,
      actors: actorsToSave,
    });
    emit("update:application", updatedApplication);
    toaster.addSuccessMessage("Acteurs sauvegardés avec succès !");
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la sauvegarde des acteurs.");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <div class="header">
      <h2>Gestion des acteurs</h2>
    </div>

    <div class="global-delete">
      <DsfrButton type="button" tertiary @click="removeSelectedActors" :disabled="selectedActorIds.length === 0">
        Supprimer la sélection
      </DsfrButton>
    </div>

    <table class="actor-table">
      <thead>
        <tr>
          <th>Sélection</th>
          <th>Email</th>
          <th>Type d'acteur</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="actor in localActors" :key="actor.id">
          <td>
            <input type="checkbox" :value="actor.id" v-model="selectedActorIds" />
          </td>
          <td>
            <DsfrInput v-model="actor.email" placeholder="Entrez l'email" />
          </td>
          <td>
            <DsfrSelect v-model="actor.actorType" :options="actorTypeOptions" />
          </td>
        </tr>
      </tbody>
    </table>

    <div class="actions">
      <DsfrButton type="button" class="add-btn" @click="addActor">Ajouter un acteur</DsfrButton>
      <DsfrButton type="button" class="cancel-btn" @click="cancelChanges" :disabled="!hasChanges"> Annuler </DsfrButton>
      <DsfrButton type="button" class="save-btn" @click="saveAll" :loading="loading">Sauvegarder</DsfrButton>
    </div>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.actor-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid var(--dsfr-border, #ccc);
  overflow: hidden;
  background-color: #fff;
  font-family: var(--dsfr-font-family, Arial, sans-serif);
}
.actor-table thead {
  background-color: var(--dsfr-gray-10, #f9f9f9);
  color: #5a5959;
}
.actor-table th,
.actor-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--dsfr-border, #ccc);
  text-align: left;
}
.actor-table th {
  font-size: 0.95rem;
  font-weight: 600;
}
.actor-table tbody tr:last-child td {
  border-bottom: none;
}
.actor-table tbody tr:nth-child(even) {
  background-color: var(--dsfr-gray-50, #fbfbfb);
}
.actor-table tbody tr:hover {
  background-color: var(--dsfr-gray-100, #f7f7f7);
}

.actor-table input[type="checkbox"] {
  width: 1.2rem;
  height: 1.2rem;
  cursor: pointer;
}

.global-delete {
  margin-bottom: 1rem;
  display: flex;
  justify-content: flex-start;
}
.global-delete DsfrButton {
  background-color: var(--dsfr-error, #d32f2f);
  color: #fff;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  transition: filter 0.3s;
}
.global-delete DsfrButton:hover:not(:disabled) {
  filter: brightness(0.9);
}

.actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
.actions DsfrButton {
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  font-weight: 600;
  transition: filter 0.3s;
}
.actions DsfrButton:hover:not(:disabled) {
  filter: brightness(0.95);
}
.cancel-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
