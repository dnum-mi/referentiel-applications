import { ApiProperty } from "@nestjs/swagger";

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

  @ApiProperty({
    description: "Average quality index",
    example: 75.5,
    required: false,
  })
  avgIq?: number;

  constructor(results: T[], total: number, avgIq?: number) {
    this.results = results;
    this.total = total;
    this.avgIq = avgIq;
  }
}
