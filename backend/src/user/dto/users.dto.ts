import { UserEntity } from "../entities/user.entity";
import { PaginatedResponseDto } from "../../common/dto";
import { ApiProperty } from "@nestjs/swagger";

export class UsersPaginatedResponseDto extends PaginatedResponseDto<UserEntity> {
  @ApiProperty({ type: [UserEntity] })
  results: UserEntity[];
}
