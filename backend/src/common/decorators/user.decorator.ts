import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserEntity as UserEntity } from 'src/user/entities/user.entity';

export const User = createParamDecorator<
  unknown,
  ExecutionContext,
  UserEntity | undefined
>((_data: unknown, ctx: ExecutionContext): UserEntity | undefined => {
  const request = ctx.switchToHttp().getRequest() as Request;
  return request.user as UserEntity | undefined;
});
