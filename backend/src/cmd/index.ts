import { program } from "commander";
import { userCommand } from "./user";

program
  .name("refapp-cli")
  .description("A CLI tool for managing the Referentiel Applications backend")
  .version(process.env.VERSION ?? "development");

userCommand(program);

program
  .parse();
