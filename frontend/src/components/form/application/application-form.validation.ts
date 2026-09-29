import { ref } from "vue";
import { isEmailValid } from "@/utils/email";
import type {
  ApplicationFormData,
  ApplicationFormErrors,
  ApplicationFormField,
  ApplicationFormIssue,
  ApplicationFormMode,
  ApplicationFormStep,
  ContactRole,
} from "./application-form.types";

interface ApplicationFormRule {
  field: ApplicationFormField;
  validate: (data: ApplicationFormData) => string | undefined;
}

interface ApplicationFormStepSchema {
  step: ApplicationFormStep;
  rules: readonly ApplicationFormRule[];
}

export const applicationInformationSchema = {
  step: 1,
  rules: [
    {
      field: "label",
      validate: ({ application }) => (application.label?.trim() ? undefined : "Le nom de l'application est obligatoire."),
    },
    {
      field: "description",
      validate: ({ application }) => (application.description?.trim() ? undefined : "La description est obligatoire."),
    },
  ],
} satisfies ApplicationFormStepSchema;

export const applicationDetailsSchema = {
  step: 2,
  rules: [],
} satisfies ApplicationFormStepSchema;

function contactSchema(role: ContactRole, step: 3 | 4): ApplicationFormStepSchema {
  const label = role.toUpperCase();
  return {
    step,
    // L'ordre suit celui des champs affichés pour que la première erreur reçoive le focus.
    rules: [
      {
        field: `${role}.email`,
        validate: (data) => {
          const email = data[role].email;
          if (!email) return `L'email du contact ${label} est obligatoire.`;
          return isEmailValid(email) ? undefined : `L'email du contact ${label} est invalide. Format attendu – ex : exemple@mail.fr`;
        },
      },
      {
        field: `${role}.organizationId`,
        validate: (data) => (data[role].organizationId ? undefined : `L'organisation ${label} est obligatoire.`),
      },
      {
        field: `${role}.firstname`,
        validate: (data) => (data[role].isGroup || data[role].firstname ? undefined : `Le prénom du contact ${label} est obligatoire.`),
      },
      {
        field: `${role}.lastname`,
        validate: (data) => (data[role].isGroup || data[role].lastname ? undefined : `Le nom du contact ${label} est obligatoire.`),
      },
    ],
  };
}

export const applicationMoaSchema = contactSchema("moa", 3);
export const applicationMoeSchema = contactSchema("moe", 4);

export const applicationFormSchemas = {
  1: applicationInformationSchema,
  2: applicationDetailsSchema,
  3: applicationMoaSchema,
  4: applicationMoeSchema,
} satisfies Record<ApplicationFormStep, ApplicationFormStepSchema>;

function validateSchema(schema: ApplicationFormStepSchema, data: ApplicationFormData): ApplicationFormIssue[] {
  return schema.rules.flatMap(({ field, validate }) => {
    const message = validate(data);
    return message ? [{ field, step: schema.step, message }] : [];
  });
}

export function useApplicationFormValidation(getData: () => ApplicationFormData, getMode: () => ApplicationFormMode) {
  const errors = ref<ApplicationFormErrors>({});

  function validateStep(step: ApplicationFormStep): ApplicationFormIssue[] {
    const schema = applicationFormSchemas[step];
    const nextErrors = { ...errors.value };
    for (const { field } of schema.rules) delete nextErrors[field];

    const issues = getMode() === "edit" && step > 2 ? [] : validateSchema(schema, getData());
    for (const { field, message } of issues) nextErrors[field] = message;
    errors.value = nextErrors;
    return issues;
  }

  function validateAll(): ApplicationFormIssue[] {
    const data = getData();
    const schemas =
      getMode() === "create" ? Object.values(applicationFormSchemas) : [applicationInformationSchema, applicationDetailsSchema];
    const issues = schemas.flatMap((schema) => validateSchema(schema, data));
    const nextErrors: ApplicationFormErrors = {};
    for (const { field, message } of issues) nextErrors[field] = message;
    errors.value = nextErrors;
    return issues;
  }

  return { errors, validateStep, validateAll };
}
