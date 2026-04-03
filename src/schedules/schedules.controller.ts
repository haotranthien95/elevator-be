import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Schedule } from '../common/entities/schedule.entity';
import {
  CreateScheduleDto,
  ListSchedulesQueryDto,
  UpdateScheduleDto,
} from './dto/admin-schedule.dto';
import { SchedulesService } from './schedules.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schedules/admin')
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly auditService: AuditService,
  ) {}

  private toScheduleResponse(schedule: Schedule) {
    return {
      id: schedule.id,
      title: schedule.title,
      maintenanceType: schedule.maintenanceType,
      scheduledDate: schedule.scheduledDate,
      status: schedule.status,
      priority: schedule.priority,
      recurrenceRule: schedule.recurrenceRule,
      notes: schedule.notes,
      isActive: schedule.isActive,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
      building: schedule.building
        ? {
            id: schedule.building.id,
            name: schedule.building.name,
            code: schedule.building.code,
          }
        : null,
      equipment: schedule.equipment
        ? {
            id: schedule.equipment.id,
            equipmentCode: schedule.equipment.equipmentCode,
            equipmentType: schedule.equipment.equipmentType,
          }
        : null,
      assignedTechnician: schedule.assignedTechnician
        ? {
            id: schedule.assignedTechnician.id,
            name: schedule.assignedTechnician.name,
            team: schedule.assignedTechnician.team,
            specialty: schedule.assignedTechnician.specialty,
          }
        : null,
      linkedReport: schedule.linkedReport
        ? {
            id: schedule.linkedReport.id,
            reportCode: schedule.linkedReport.reportCode,
            status: schedule.linkedReport.status,
          }
        : null,
    };
  }

  @Get()
  async findAll(@Query() query: ListSchedulesQueryDto) {
    const data = await this.schedulesService.findAll(query);
    return { success: true, total: data.length, data: data.map((item) => this.toScheduleResponse(item)) };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.schedulesService.findOne(id);
    return { success: true, data: this.toScheduleResponse(data) };
  }

  @Roles('admin', 'dispatcher')
  @Post()
  async create(
    @Body() payload: CreateScheduleDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const data = await this.schedulesService.create(payload);

    await this.auditService.recordFromActor(request.user, {
      action: 'schedule.created',
      resourceType: 'schedule',
      resourceId: data.id,
      resourceLabel: data.title,
      details: {
        building: data.building?.name ?? null,
        scheduledDate: data.scheduledDate?.toISOString?.() ?? data.scheduledDate,
        priority: data.priority,
        status: data.status,
      },
    });

    return {
      success: true,
      message: 'Schedule created successfully',
      data: this.toScheduleResponse(data),
    };
  }

  @Roles('admin', 'dispatcher')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateScheduleDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const data = await this.schedulesService.update(id, payload);

    await this.auditService.recordFromActor(request.user, {
      action: 'schedule.updated',
      resourceType: 'schedule',
      resourceId: data.id,
      resourceLabel: data.title,
      details: {
        building: data.building?.name ?? null,
        scheduledDate: data.scheduledDate?.toISOString?.() ?? data.scheduledDate,
        priority: data.priority,
        status: data.status,
      },
    });

    return {
      success: true,
      message: 'Schedule updated successfully',
      data: this.toScheduleResponse(data),
    };
  }

  @Roles('admin', 'dispatcher')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const schedule = await this.schedulesService.findOne(id);
    await this.schedulesService.remove(id);

    await this.auditService.recordFromActor(request.user, {
      action: 'schedule.deleted',
      resourceType: 'schedule',
      resourceId: schedule.id,
      resourceLabel: schedule.title,
      details: {
        building: schedule.building?.name ?? null,
        scheduledDate: schedule.scheduledDate?.toISOString?.() ?? schedule.scheduledDate,
        status: schedule.status,
      },
    });

    return {
      success: true,
      message: 'Schedule deleted successfully',
    };
  }
}
