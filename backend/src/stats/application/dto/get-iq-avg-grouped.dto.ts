import { ApiProperty } from "@nestjs/swagger";

export class GetIqAvgGroupedDto {
  @ApiProperty({ example: "2025-07" })
  label: string;

  @ApiProperty({ example: 78.2 })
  moyenne: number;

  @ApiProperty({ example: 62 })
  min: number;

  @ApiProperty({ example: 93 })
  max: number;

  @ApiProperty({ example: 14 })
  count: number;
}
