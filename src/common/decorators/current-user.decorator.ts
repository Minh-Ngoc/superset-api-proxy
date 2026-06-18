import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  userId: string;
  phone: string;
  // cookies: any;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest<any>();
    return {
      userId: request?.user?.userId,
      phone: request?.user?.phone,
    };
  },
);
