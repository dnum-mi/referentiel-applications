import { ApiProperty } from '@nestjs/swagger';
import { IsBooleanString, IsOptional, IsString } from 'class-validator';
import { PaginationQury } from '../../global-dto/pagination.dto';

export class FilterOrganisationsDto extends PaginationQury {
  @ApiProperty()
  @IsString()
  @IsOptional()
  label?: string | undefined;

  @ApiProperty()
  @IsString()
  @IsOptional()
  code?: string | undefined;

  @ApiProperty()
  @IsBooleanString()
  @IsOptional()
  parent?: boolean;
}
