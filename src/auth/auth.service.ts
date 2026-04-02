import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { parseJwtExpiresIn, signJwtToken } from './jwt-token.util';

@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  private getAdminProfile() {
    return {
      id: 'ops-admin',
      email: this.configService
        .get<string>('ADMIN_EMAIL', 'ops@yomaelevator.com')
        .trim()
        .toLowerCase(),
      password: this.configService.get<string>('ADMIN_PASSWORD', 'preview-access'),
      name: this.configService.get<string>('ADMIN_NAME', 'Operations Admin'),
      role: 'admin',
    } as const;
  }

  async login(payload: LoginDto) {
    const admin = this.getAdminProfile();
    const email = payload.email.trim().toLowerCase();

    if (email !== admin.email || payload.password !== admin.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '8h');
    const accessToken = signJwtToken(
      user,
      this.configService.get<string>('JWT_SECRET', 'dev-jwt-secret-change-me'),
      parseJwtExpiresIn(expiresIn),
    );

    return {
      accessToken,
      expiresIn,
      user,
    };
  }
}
