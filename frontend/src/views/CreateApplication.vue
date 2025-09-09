<script lang="ts" setup>
import { ref } from "vue";

const type = "text";
const label = "Label champ de saisie";
const placeholder = "Yo";
const modelValue = ref("");
const modelValue2 = ref("");
const validMessage1 = "Message de validation";
const errorMessage1 = "Message d’erreur";
const errorMessage2 = "Message d’erreur 2";
const hint = "Texte d’indice du champ";
const id = "";
const readonly = "";
</script>

<template>
  <div class="fr-container fr-my-2w" data-testid="create-application-page">
    <h2 data-testid="create-application-title">
      Ajouter une application
    </h2>
    <div class="form-input">
      <div>
        <DsfrInputGroup
          :id="id"
          data-testid="create-input-valid"
          :valid-message="validMessage1"
          :placeholder="placeholder"
          :readonly="readonly !== ''"
          :model-value="modelValue"
          :label="label"
          :type="type"
          :hint="hint"
          label-visible
        />

        <h2>2. Avec un message d’erreur</h2>

        <DsfrInputGroup
          :id="id"
          data-testid="create-input-error"
          :error-message="errorMessage1"
          :placeholder="placeholder"
          :readonly="readonly !== ''"
          :model-value="modelValue"
          :label="label"
          :type="type"
          :hint="hint"
          label-visible
        />

        <h2>3. Avec plusieurs messages</h2>

        <DsfrInputGroup
          :id="id"
          data-testid="create-input-multiple"
          :error-message="[errorMessage1, errorMessage2]"
          :valid-message="[validMessage1]"
          :placeholder="placeholder"
          :readonly="readonly !== ''"
          :model-value="modelValue"
          :label="label"
          :type="type"
          :hint="hint"
          label-visible
        />

        <h2>4. Avec plusieurs champs de saisie</h2>

        <DsfrInputGroup valid-message="Tout va bien pour ces deux champs" data-testid="create-input-multi-fields">
          <p>
            <DsfrInput
              :id="id"
              data-testid="create-input-field-1"
              :placeholder="placeholder"
              :readonly="readonly !== ''"
              :model-value="modelValue"
              :label="label"
              :type="type"
              :hint="hint"
              label-visible
            />
          </p>

          <p>
            <DsfrInput
              :id="id"
              data-testid="create-input-field-2"
              :placeholder="placeholder"
              :readonly="readonly !== ''"
              :model-value="modelValue2"
              :label="label"
              :type="type"
              :hint="hint"
              label-visible
            />
          </p>
        </DsfrInputGroup>
        div
      </div>
      <div>
        <DsfrInputGroup
          :id="id"
          data-testid="create-input-valid-2"
          :valid-message="validMessage1"
          :placeholder="placeholder"
          :readonly="readonly !== ''"
          :model-value="modelValue"
          :label="label"
          :type="type"
          :hint="hint"
          label-visible
        />

        <h2>2. Avec un message d’erreur</h2>

        <DsfrInputGroup
          :id="id"
          data-testid="create-input-error-2"
          :error-message="errorMessage1"
          :placeholder="placeholder"
          :readonly="readonly !== ''"
          :model-value="modelValue"
          :label="label"
          :type="type"
          :hint="hint"
          label-visible
        />

        <h2>3. Avec plusieurs messages</h2>

        <DsfrInputGroup
          :id="id"
          data-testid="create-input-multiple-2"
          :error-message="[errorMessage1, errorMessage2]"
          :valid-message="[validMessage1]"
          :placeholder="placeholder"
          :readonly="readonly !== ''"
          :model-value="modelValue"
          :label="label"
          :type="type"
          :hint="hint"
          label-visible
        />

        <h2>4. Avec plusieurs champs de saisie</h2>

        <DsfrInputGroup valid-message="Tout va bien pour ces deux champs" data-testid="create-input-multi-fields-2">
          <p>
            <DsfrInput
              :id="id"
              data-testid="create-input-field-3"
              :placeholder="placeholder"
              :readonly="readonly !== ''"
              :model-value="modelValue"
              :label="label"
              :type="type"
              :hint="hint"
              label-visible
            />
          </p>

          <p>
            <DsfrInput
              :id="id"
              data-testid="create-input-field-4"
              :placeholder="placeholder"
              :readonly="readonly !== ''"
              :model-value="modelValue2"
              :label="label"
              :type="type"
              :hint="hint"
              label-visible
            />
          </p>
        </DsfrInputGroup>
      </div>
    </div>
  </div>
</template>

<style>
.form-input {
  display: flex;
  justify-content: space-between;
}
</style>
