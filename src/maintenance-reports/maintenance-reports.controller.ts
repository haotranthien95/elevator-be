import { Body, Controller, Post } from '@nestjs/common';
import { CreateMaintenanceReportDto } from '../common/dto/create-maintenance-report.dto';
import { MaintenanceReportsService } from './maintenance-reports.service';

@Controller('maintenance-reports')
export class MaintenanceReportsController {
  constructor(
    private readonly maintenanceReportsService: MaintenanceReportsService,
  ) {}

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
}
