import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRole } from '../common/entities/user.entity';
import { ROLES_KEY } from './roles.decorator';

type AuthenticatedRequest = Request & {
  user?: {
    role?: string;
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.user?.role?.trim().toLowerCase();

    if (!role) {
      throw new ForbiddenException('User role is missing from the session');
    }

    if (!requiredRoles.includes(role as UserRole)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return true;
  }
}
