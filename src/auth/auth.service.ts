import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { parseJwtExpiresIn, signJwtToken } from './jwt-token.util';
import { hashPassword, verifyPassword } from './password.util';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private getSeedAdminProfile() {
    return {
      email: this.configService
        .get<string>('ADMIN_EMAIL', 'ops@yomaelevator.com')
        .trim()
        .toLowerCase(),
      password: this.configService.get<string>('ADMIN_PASSWORD', 'preview-access'),
      name: this.configService.get<string>('ADMIN_NAME', 'Operations Admin').trim(),
      role: 'admin' as const,
    };
  }

  async onModuleInit() {
    const admin = this.getSeedAdminProfile();
    const existing = await this.userRepository.findOne({ where: { email: admin.email } });

    if (!existing) {
      await this.userRepository.save(
        this.userRepository.create({
          email: admin.email,
          passwordHash: hashPassword(admin.password),
          name: admin.name,
          role: admin.role,
          isActive: true,
        }),
      );
      return;
    }

    if (existing.role !== 'admin' || !existing.isActive) {
      existing.role = 'admin';
      existing.isActive = true;
      await this.userRepository.save(existing);
    }
  }

  async login(payload: LoginDto) {
    const email = payload.email.trim().toLowerCase();
    const account = await this.userRepository.findOne({ where: { email } });

    if (!account || !account.isActive || !verifyPassword(payload.password, account.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = {
      sub: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
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
