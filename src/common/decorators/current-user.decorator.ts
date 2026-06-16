import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  accessToken: string;
  csrfToken: string;
  // cookies: any;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest<CurrentUserPayload>();
    return {
      accessToken: request.accessToken,
      csrfToken: request.csrfToken,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      // cookies: request.cookies,
    };
  },
);
