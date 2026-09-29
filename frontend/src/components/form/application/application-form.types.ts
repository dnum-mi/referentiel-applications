import type { CreateActorDto, CreateApplicationDto, CreateApplicationStatusDto, OrganizationDto } from "@/client/types.gen";

export type ApplicationFormMode = "create" | "edit";
export type ApplicationFormStep = 1 | 2 | 3 | 4;
export type ContactRole = "moa" | "moe";
export type ContactField = "email" | "organizationId" | "firstname" | "lastname";
export type ApplicationFormField = "label" | "description" | `${ContactRole}.${ContactField}`;
export type ApplicationFormErrors = Partial<Record<ApplicationFormField, string>>;

export type ApplicationFormState = Omit<CreateApplicationDto, "purposes" | "targetPopulations" | "status"> & {
  purposes: string[];
  targetPopulations: string[];
  status: CreateApplicationStatusDto;
};

export interface ApplicationFormData {
  application: ApplicationFormState;
  moa: CreateActorDto;
  moe: CreateActorDto;
}

export interface ApplicationFormIssue {
  field: ApplicationFormField;
  step: ApplicationFormStep;
  message: string;
}

export interface ApplicationStepHandle {
  focusField: (field: ApplicationFormField) => void | Promise<void>;
}

export interface ApplicationContactStepProps {
  errors: ApplicationFormErrors;
  initialOrganization: OrganizationDto | null;
  isSyncing: boolean;
}

export const applicationFormSteps = ["Informations principales", "Détails de l'application", "Contact MOA", "Contact MOE"];
