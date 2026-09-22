import type { ServiceTokenMode, TokenDto } from "@/client/types.gen";

export const TokenKindWording: Record<TokenDto["kind"], string> = {
  service: "Applicatif",
  personal: "Utilisateur",
};

export const ServiceTokenModeWording: Record<ServiceTokenMode, string> = {
  machine: "Traitement machine autonome",
  delegated: "Au nom d’un utilisateur",
};

export const ServiceTokenModeHint: Record<ServiceTokenMode, string> = {
  machine:
    "Pour les scripts et synchronisations sans utilisateur connecté. Le token suffit ; les droits et le périmètre du service s’appliquent.",
  delegated: "Chaque appel exige le JWT de l’utilisateur. Les droits sont limités à ceux que le service et l’utilisateur ont en commun.",
};
