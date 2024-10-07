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
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['asc', 'desc'], { each: true })
  order: string;
}

export class PaginationQury {
  @IsString()
  @IsOptional()
  searchQuery?: string;

  @IsNumberString()
  @Transform(({ value }) => value || 1)
  @IsOptional()
  currentPage?: number;

  @IsNumberString()
  @Transform(({ value }) => value || 5)
  @IsOptional()
  maxPerPage?: number;

  @IsOptional()
  @ValidateNested()
  @IsArray()
  @Type(() => PaginationSort)
  sort?: PaginationSort[];
}
