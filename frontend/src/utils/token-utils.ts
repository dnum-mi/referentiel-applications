import type { TokenDto } from "@/client/types.gen";

export const TokenKindWording: Record<TokenDto["kind"], string> = {
  service: "Applicatif",
  personal: "Utilisateur",
};
