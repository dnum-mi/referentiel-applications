import { Controller, Patch, Body, Param, Get, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiTags } from '@nestjs/swagger';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@Controller('/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(id, updateUserDto);
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.userService.findAll();
  }
}
