import { PartialType } from '@nestjs/swagger';
import { CreateHostingDto } from './create-hosting.dto';

export class UpdateHostingDto extends PartialType(CreateHostingDto) {}
