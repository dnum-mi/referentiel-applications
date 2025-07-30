import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { AdminLevel } from '../entities/user.entity';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  adminLevel?: AdminLevel;
}
