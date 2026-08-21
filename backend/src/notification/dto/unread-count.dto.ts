import { ApiProperty } from "@nestjs/swagger";

export class UnreadCountDto {
  @ApiProperty({ example: 3 })
  count: number;
}
