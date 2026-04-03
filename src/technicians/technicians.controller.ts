import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateTechnicianDto,
  ListTechniciansQueryDto,
  UpdateTechnicianDto,
} from './dto/admin-technician.dto';
import { TechniciansService } from './technicians.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('technicians/admin')
export class TechniciansController {
  constructor(
    private readonly techniciansService: TechniciansService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async findAll(@Query() query: ListTechniciansQueryDto) {
    const data = await this.techniciansService.findAll(query);
    return { success: true, total: data.length, data };
  }

  @Roles('admin')
  @Post()
  async create(
    @Body() payload: CreateTechnicianDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const data = await this.techniciansService.create(payload);
    await this.auditService.recordFromActor(request.user, {
      action: 'technician.created',
      resourceType: 'technician',
      resourceId: data.id,
      resourceLabel: data.name,
      details: {
        team: data.team,
        specialty: data.specialty,
        isActive: data.isActive,
      },
    });
    return { success: true, message: 'Technician created successfully', data };
  }

  @Roles('admin')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateTechnicianDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const data = await this.techniciansService.update(id, payload);
    await this.auditService.recordFromActor(request.user, {
      action: 'technician.updated',
      resourceType: 'technician',
      resourceId: data.id,
      resourceLabel: data.name,
      details: {
        team: data.team,
        specialty: data.specialty,
        isActive: data.isActive,
      },
    });
    return { success: true, message: 'Technician updated successfully', data };
  }
}
