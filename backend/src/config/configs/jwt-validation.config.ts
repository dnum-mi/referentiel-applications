import { Logger } from "@nestjs/common";
import { registerAs } from "@nestjs/config";

const logger = new Logger("JwtValidationConfig");

export const jwtValidationConfig = registerAs("jwtValidation", () => {
  const disabled = process.env.DISABLE_JWT_VALIDATION === "true";

  if (disabled && process.env.NODE_ENV !== "development") {
    throw new Error(
      "DISABLE_JWT_VALIDATION=true est autorisé uniquement avec NODE_ENV=development.",
    );
  }

  if (disabled) {
    logger.warn(
      "DISABLE_JWT_VALIDATION=true : les jetons JWT sont décodés sans vérification de signature ni d'expiration (développement uniquement).",
    );
  }

  return { disabled };
});
