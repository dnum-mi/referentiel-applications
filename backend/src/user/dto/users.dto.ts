import { ApiProperty } from "@nestjs/swagger";
import { PaginatedResponseDto } from "../../common/dto";
import { UserEntity } from "../entities/user.entity";

export class UsersPaginatedResponseDto extends PaginatedResponseDto<UserEntity> {
  @ApiProperty({ type: [UserEntity] })
  results: UserEntity[];
}
