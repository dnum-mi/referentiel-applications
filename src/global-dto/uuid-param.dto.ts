import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UUIDParam {
  @IsUUID()
  id: string;
}

export class IDParam {
  @IsString()
  @IsNotEmpty()
  id: string;
}
