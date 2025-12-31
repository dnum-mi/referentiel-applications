import { emailConfig } from "../configs/email.config";
import appConfig from "./app.config";
import databaseConfig from "./database.config";
import keycloakConfig from "./keycloak.config";

export { appConfig, databaseConfig, emailConfig, keycloakConfig };

export const configs = [appConfig, emailConfig, databaseConfig, keycloakConfig];
