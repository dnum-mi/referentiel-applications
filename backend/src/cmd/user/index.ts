import type { Command } from "commander";
import { userCreateCommand } from "./create";

export function userCommand(program: Command): void {
  const userCommand = program.command("user")
    .description("Manage users");

  userCreateCommand(userCommand);
}
