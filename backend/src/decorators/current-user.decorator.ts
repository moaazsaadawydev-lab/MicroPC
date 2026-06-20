import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { USER_KEY } from 'src/utils/constants';

export const CurrentUser = createParamDecorator(
  (data, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request[USER_KEY];
  },
);
