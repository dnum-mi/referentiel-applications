import { PartialType } from "@nestjs/swagger";
import { CreateApplicationStatusDto } from "./application-status.dto";

export class UpdateApplicationStatusDto extends PartialType(CreateApplicationStatusDto) {}
