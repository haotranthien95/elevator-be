import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashPassword } from '../auth/password.util';
import { User } from '../common/entities/user.entity';
import {
  CreateUserDto,
  ListUsersQueryDto,
  UpdateUserDto,
} from './dto/admin-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private normalizeEmail(value: string) {
    return value.trim().toLowerCase();
  }

  async findAll(query: ListUsersQueryDto): Promise<User[]> {
    const userQuery = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.role', 'ASC')
      .addOrderBy('user.name', 'ASC');

    if (query.activeOnly) {
      userQuery.andWhere('user.isActive = :isActive', { isActive: true });
    }

    if (query.role) {
      userQuery.andWhere('user.role = :role', { role: query.role });
    }

    if (query.search?.trim()) {
      userQuery.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR user.role ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    return userQuery.getMany();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(payload: CreateUserDto): Promise<User> {
    const email = this.normalizeEmail(payload.email);
    const existing = await this.userRepository.findOne({ where: { email } });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const user = this.userRepository.create({
      email,
      passwordHash: hashPassword(payload.password),
      name: payload.name.trim(),
      role: payload.role ?? 'viewer',
      isActive: payload.isActive ?? true,
    });

    return this.userRepository.save(user);
  }

  async update(id: string, payload: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (payload.email !== undefined) {
      const email = this.normalizeEmail(payload.email);
      const existing = await this.userRepository.findOne({ where: { email } });

      if (existing && existing.id !== user.id) {
        throw new ConflictException('A user with this email already exists');
      }

      user.email = email;
    }

    if (payload.password !== undefined && payload.password.trim()) {
      user.passwordHash = hashPassword(payload.password.trim());
    }

    if (payload.name !== undefined) {
      user.name = payload.name.trim();
    }

    if (payload.role !== undefined) {
      user.role = payload.role;
    }

    if (payload.isActive !== undefined) {
      user.isActive = payload.isActive;
    }

    return this.userRepository.save(user);
  }
}
