import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
  ) {}

  private toAdminReportResponse(report: MaintenanceReport) {
    return {
      id: report.id,
      reportCode: report.reportCode,
      status: report.status,
      priority: report.priority,
      assignedTo: report.assignedTo,
      maintenanceType: report.maintenanceType,
      technicianName: report.technicianName,
      arrivalDateTime: report.arrivalDateTime,
      submittedAt: report.submittedAt,
      updatedAt: report.updatedAt,
      findings: report.findings,
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

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query() query: ListMaintenanceReportsQueryDto) {
    const reports = await this.maintenanceReportsService.findAll(query);

    return {
      success: true,
      total: reports.length,
      data: reports.map((report) => this.toAdminReportResponse(report)),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':reportCode')
  async findOne(@Param('reportCode') reportCode: string) {
    const report = await this.maintenanceReportsService.findOneByReportCode(reportCode);

    return {
      success: true,
      data: this.toAdminReportResponse(report),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':reportCode/status')
  async updateStatus(
    @Param('reportCode') reportCode: string,
    @Body() payload: UpdateReportStatusDto,
  ) {
    const report = await this.maintenanceReportsService.updateStatus(reportCode, payload);

    return {
      success: true,
      message: 'Report status updated successfully',
      data: this.toAdminReportResponse(report),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':reportCode/assign')
  async assign(
    @Param('reportCode') reportCode: string,
    @Body() payload: AssignMaintenanceReportDto,
  ) {
    const report = await this.maintenanceReportsService.assign(reportCode, payload);

    return {
      success: true,
      message: 'Report assignment updated successfully',
      data: this.toAdminReportResponse(report),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':reportCode/notes')
  async addNote(
    @Param('reportCode') reportCode: string,
    @Body() payload: CreateMaintenanceReportNoteDto,
  ) {
    const report = await this.maintenanceReportsService.addNote(reportCode, payload);

    return {
      success: true,
      message: 'Internal note added successfully',
      data: this.toAdminReportResponse(report),
    };
  }
}
