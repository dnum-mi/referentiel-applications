import { emailConfig } from "../configs/email.config";
import appConfig from "./app.config";
import { authLevelConfig } from "./auth-level.config";
import { correlationConfig } from "./correlation.config";
import databaseConfig from "./database.config";
import oidcConfig from "./oidc.config";
import { technologyConfig } from "./technology.config";

export {
  appConfig,
  authLevelConfig,
  correlationConfig,
  databaseConfig,
  emailConfig,
  oidcConfig,
  technologyConfig,
};

export const configs = [
  appConfig,
  emailConfig,
  databaseConfig,
  oidcConfig,
  authLevelConfig,
  correlationConfig,
  technologyConfig,
];
