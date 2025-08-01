import { IsString } from "class-validator";

export class AppPermsDto {
  @IsString()
  actorTypeId: string;

  [key: string]: boolean | string;
}
