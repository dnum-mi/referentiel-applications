import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class Pagination<T> {
  totalCount: number;
  data: Array<T>;
  currentPage: number;
  maxPerPage: number;
  totalPages: number;
}

export class PaginationSort {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsIn(['asc', 'desc'], { each: true })
  order: string;
}

export class PaginationQury {
  @IsString()
  @IsOptional()
  searchQuery?: string;

  @ApiProperty({ default: 1, type: Number })
  @IsNumberString()
  @Transform(({ value }) => value || 1)
  @IsOptional()
  currentPage?: number;

  @ApiProperty({ default: 10, type: Number })
  @IsNumberString()
  @Transform(({ value }) => value || 5)
  @IsOptional()
  maxPerPage?: number;

  @ApiProperty({ type: [PaginationSort], isArray: true })
  @IsOptional()
  @ValidateNested()
  @IsArray()
  @Type(() => PaginationSort)
  sort?: PaginationSort[];
}
