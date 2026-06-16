/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

interface RequestWithUser extends Request {
  accessToken: string;
  csrfToken: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor() {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    // Extract token from Authorization header or cookie
    const { accessToken, csrfToken, cookies } =
      this.extractTokenFromHeader(request);

    if (!accessToken || !csrfToken) {
      this.logger.warn('No token found in request');
      throw new UnauthorizedException('No token found in request!');
    }

    try {
      // Attach user to request object
      request.accessToken = accessToken;
      request.csrfToken = csrfToken;
      request.cookies = cookies;

      return await new Promise((resolve) => resolve(true));
    } catch (error: any) {
      // Log error for debugging
      this.logger.error(
        `Token verification failed: ${error?.message}`,
        error?.stack,
      );

      // Re-throw if already UnauthorizedException
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Generic unauthorized error
      throw new UnauthorizedException(`Unauthorized Exception`);
    }
  }

  private extractTokenFromHeader(request: RequestWithUser): {
    accessToken: string;
    csrfToken: string;
    cookies: string;
  } {
    const authHeader = request.headers['authorization'];
    const csrfHeader = request.headers['x-csrftoken'];
    const cookies = request.headers['cookie'];

    if (
      !authHeader ||
      typeof authHeader !== 'string' ||
      !csrfHeader ||
      typeof csrfHeader !== 'string'
    ) {
      return {
        accessToken: '',
        csrfToken: '',
        cookies: '',
      };
    }

    const [type, token] = authHeader.split(' ') ?? [];

    if (type === 'Bearer' && token) {
      this.logger.debug('Token extracted from Authorization header');
      return {
        accessToken: token,
        csrfToken: csrfHeader,
        cookies: cookies ?? '',
      };
    }

    return {
      accessToken: '',
      csrfToken: '',
      cookies: '',
    };
  }
}
