import { ApiProperty } from "@nestjs/swagger";
import { Type } from "@nestjs/common";

/**
 * Generic paginated response DTO
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: "Array of results",
    isArray: true,
  })
  results: T[];

  @ApiProperty({
    description: "Total number of items",
    example: 100,
  })
  total: number;

  static of<T>(classRef: Type<T>): Type<PaginatedResponseDto<T>> {
    class PaginatedClass extends PaginatedResponseDto<T> {
      @ApiProperty({ type: () => classRef, isArray: true })
      results: T[];
    }
    Object.defineProperty(PaginatedClass, "name", {
      value: `Paginated${classRef.name}`,
    });
    return PaginatedClass;
  }
}
