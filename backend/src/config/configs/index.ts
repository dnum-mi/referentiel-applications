import { emailConfig } from "../configs/email.config";
import appConfig from "./app.config";
import { correlationConfig } from "./correlation.config";
import databaseConfig from "./database.config";
import oidcConfig from "./oidc.config";
import { technologyConfig } from "./technology.config";

export {
  appConfig,
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
  correlationConfig,
  technologyConfig,
];
