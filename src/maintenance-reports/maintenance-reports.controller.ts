import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateMaintenanceReportDto } from '../common/dto/create-maintenance-report.dto';
import { MaintenanceReport } from '../common/entities/maintenance-report.entity';
import {
  AssignMaintenanceReportDto,
  CreateMaintenanceReportNoteDto,
  ListMaintenanceReportsQueryDto,
  UpdateReportStatusDto,
} from './dto/admin-report-actions.dto';
import { MaintenanceReportsService } from './maintenance-reports.service';

@Controller('maintenance-reports')
export class MaintenanceReportsController {
  constructor(
    private readonly maintenanceReportsService: MaintenanceReportsService,
    private readonly auditService: AuditService,
  ) {}

  private toAdminReportResponse(report: MaintenanceReport) {
    return {
      id: report.id,
      reportCode: report.reportCode,
      status: report.status,
      priority: report.priority,
      assignedTo: report.assignedTechnician?.name ?? report.assignedTo,
      assignedTechnician: report.assignedTechnician
        ? {
            id: report.assignedTechnician.id,
            name: report.assignedTechnician.name,
            team: report.assignedTechnician.team,
            specialty: report.assignedTechnician.specialty,
          }
        : null,
      maintenanceType: report.maintenanceType,
      technicianName: report.technicianName,
      arrivalDateTime: report.arrivalDateTime,
      submittedAt: report.submittedAt,
      updatedAt: report.updatedAt,
      findings: report.findings,
      checklistResults: report.checklistResults,
      workPerformed: report.workPerformed,
      partsUsed: report.partsUsed,
      remarks: report.remarks,
      photos: report.photos ?? [],
      technicianSignature: report.technicianSignature,
      customerSignature: report.customerSignature,
      internalNotes: report.internalNotes ?? [],
      building: report.building
        ? {
            id: report.building.id,
            name: report.building.name,
          }
        : null,
      equipment: report.equipment
        ? {
            id: report.equipment.id,
            equipmentCode: report.equipment.equipmentCode,
            equipmentType: report.equipment.equipmentType,
          }
        : null,
    };
  }

  @Post()
  async create(@Body() payload: CreateMaintenanceReportDto) {
    const report = await this.maintenanceReportsService.create(payload);

    return {
      success: true,
      message: 'Maintenance report submitted successfully',
      data: {
        reportCode: report.reportCode,
        status: report.status,
        photoCount: report.photos?.length ?? 0,
        hasTechnicianSignature: Boolean(report.technicianSignature),
        hasCustomerSignature: Boolean(report.customerSignature),
        submittedAt: report.submittedAt,
      },
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async findAll(@Query() query: ListMaintenanceReportsQueryDto) {
    const reports = await this.maintenanceReportsService.findAll(query);

    return {
      success: true,
      total: reports.length,
      data: reports.map((report) => this.toAdminReportResponse(report)),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':reportCode')
  async findOne(@Param('reportCode') reportCode: string) {
    const report = await this.maintenanceReportsService.findOneByReportCode(reportCode);

    return {
      success: true,
      data: this.toAdminReportResponse(report),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'dispatcher')
  @Patch(':reportCode/status')
  async updateStatus(
    @Param('reportCode') reportCode: string,
    @Body() payload: UpdateReportStatusDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const report = await this.maintenanceReportsService.updateStatus(reportCode, payload);

    await this.auditService.recordFromActor(request.user, {
      action: 'report.status.updated',
      resourceType: 'maintenance-report',
      resourceId: report.id,
      resourceLabel: report.reportCode,
      details: {
        status: report.status,
        priority: report.priority,
        note: payload.note?.trim() || null,
      },
    });

    return {
      success: true,
      message: 'Report status updated successfully',
      data: this.toAdminReportResponse(report),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'dispatcher')
  @Patch(':reportCode/assign')
  async assign(
    @Param('reportCode') reportCode: string,
    @Body() payload: AssignMaintenanceReportDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const report = await this.maintenanceReportsService.assign(reportCode, payload);

    await this.auditService.recordFromActor(request.user, {
      action: 'report.assignment.updated',
      resourceType: 'maintenance-report',
      resourceId: report.id,
      resourceLabel: report.reportCode,
      details: {
        assignedTo: report.assignedTechnician?.name ?? report.assignedTo,
        priority: report.priority,
        note: payload.note?.trim() || null,
      },
    });

    return {
      success: true,
      message: 'Report assignment updated successfully',
      data: this.toAdminReportResponse(report),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'dispatcher')
  @Post(':reportCode/notes')
  async addNote(
    @Param('reportCode') reportCode: string,
    @Body() payload: CreateMaintenanceReportNoteDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const report = await this.maintenanceReportsService.addNote(reportCode, payload);

    await this.auditService.recordFromActor(request.user, {
      action: 'report.note.added',
      resourceType: 'maintenance-report',
      resourceId: report.id,
      resourceLabel: report.reportCode,
      details: {
        noteKind: payload.kind ?? 'system',
        author: payload.author.trim(),
        textPreview: payload.text.trim().slice(0, 160),
      },
    });

    return {
      success: true,
      message: 'Internal note added successfully',
      data: this.toAdminReportResponse(report),
    };
  }
}
