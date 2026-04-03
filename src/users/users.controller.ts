import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { User } from '../common/entities/user.entity';
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from './dto/admin-user.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('users/admin')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  private serializeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Get()
  async findAll(@Query() query: ListUsersQueryDto) {
    const data = await this.usersService.findAll(query);
    return {
      success: true,
      total: data.length,
      data: data.map((user) => this.serializeUser(user)),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.usersService.findOne(id);
    return { success: true, data: this.serializeUser(data) };
  }

  @Post()
  async create(
    @Body() payload: CreateUserDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const data = await this.usersService.create(payload);

    await this.auditService.recordFromActor(request.user, {
      action: 'user.created',
      resourceType: 'user',
      resourceId: data.id,
      resourceLabel: data.email,
      details: {
        name: data.name,
        role: data.role,
        isActive: data.isActive,
      },
    });

    return {
      success: true,
      message: 'User created successfully',
      data: this.serializeUser(data),
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateUserDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const data = await this.usersService.update(id, payload);

    await this.auditService.recordFromActor(request.user, {
      action: 'user.updated',
      resourceType: 'user',
      resourceId: data.id,
      resourceLabel: data.email,
      details: {
        name: data.name,
        role: data.role,
        isActive: data.isActive,
      },
    });

    return {
      success: true,
      message: 'User updated successfully',
      data: this.serializeUser(data),
    };
  }
}
