import { BadGatewayException } from "@nestjs/common";

/**
 * Le scan EcoIndex dépend d'un site tiers saisi par l'utilisateur. Un échec de ce site (délai
 * dépassé, statut HTTP, redirection refusée) n'est pas une faute du référentiel : il devenait un
 * 500 portant le message technique de `fetch`. Un 502 nomme la bonne responsabilité et le détail
 * reste dans les logs (#2292).
 */
export class EcoIndexUnavailableException extends BadGatewayException {
  constructor(cause?: unknown) {
    super(
      "Le site cible n'a pas pu être analysé : il est injoignable ou a renvoyé une erreur. Vérifiez l'URL renseignée puis relancez le calcul.",
      { cause },
    );
  }
}
