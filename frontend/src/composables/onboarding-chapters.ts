export interface OnboardingChapter {
  id: string;
  label: string;
}

export const ONBOARDING_CHAPTERS: OnboardingChapter[] = [
  { id: "search", label: "Recherche & fiche application" },
  { id: "profile", label: "Mon profil" },
  { id: "sheet", label: "Fiche application" },
  { id: "actor", label: "Vos applications & votre rôle" },
  { id: "help", label: "Signalements & aide" },
  { id: "time", label: "Time — dette technique" },
];
