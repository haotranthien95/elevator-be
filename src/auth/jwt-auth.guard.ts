import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { verifyJwtToken } from './jwt-token.util';

type JwtPayload = {
  sub: string;
  email: string;
  name: string;
  role: string;
  exp?: number;
  iat?: number;
};

type AuthenticatedRequest = Request & {
  user?: JwtPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication token is required');
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      throw new UnauthorizedException('Authentication token is required');
    }

    try {
      request.user = verifyJwtToken<JwtPayload>(
        token,
        this.configService.get<string>('JWT_SECRET', 'dev-jwt-secret-change-me'),
      );
      return true;
    } catch {
      throw new UnauthorizedException('Session expired or invalid');
    }
  }
}
