import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AlertsService } from './alerts.service';
import { AcknowledgeAlertDto } from './dto/acknowledge-alert.dto';
import { AlertsQueryDto } from './dto/alerts-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'dispatcher')
@Controller('alerts/admin')
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly auditService: AuditService,
  ) {}

  @Get('summary')
  async getSummary(@Query() query: AlertsQueryDto) {
    return {
      success: true,
      data: await this.alertsService.getSummary(query),
    };
  }

  @Post('acknowledge')
  async acknowledge(
    @Body() payload: AcknowledgeAlertDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const data = await this.alertsService.acknowledgeAlert(payload, request.user);

    await this.auditService.recordFromActor(request.user, {
      action: 'alert.acknowledged',
      resourceType: 'operational-alert',
      resourceId: `${payload.alertType}:${payload.resourceId}`,
      resourceLabel: payload.resourceLabel?.trim() || payload.resourceId,
      details: {
        alertType: payload.alertType,
        resourceType: payload.resourceType,
        resourceId: payload.resourceId,
        status: data.status,
        snoozeHours: payload.snoozeHours ?? null,
        snoozedUntil: data.snoozedUntil?.toISOString?.() ?? null,
      },
    });

    return {
      success: true,
      message: data.status === 'snoozed' ? 'Alert snoozed successfully' : 'Alert acknowledged successfully',
      data,
    };
  }

  @Delete('acknowledge')
  async clearAcknowledgement(
    @Query('alertType') alertType: string | undefined,
    @Query('resourceId') resourceId: string | undefined,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const normalizedAlertType = alertType?.trim();
    const normalizedResourceId = resourceId?.trim();

    if (!normalizedAlertType || !normalizedResourceId) {
      throw new BadRequestException('alertType and resourceId are required');
    }

    const cleared = await this.alertsService.clearAcknowledgement(
      normalizedAlertType,
      normalizedResourceId,
    );

    await this.auditService.recordFromActor(request.user, {
      action: 'alert.acknowledgement.cleared',
      resourceType: 'operational-alert',
      resourceId: `${normalizedAlertType}:${normalizedResourceId}`,
      resourceLabel: cleared?.resourceLabel ?? normalizedResourceId,
      details: {
        alertType: normalizedAlertType,
        resourceId: normalizedResourceId,
      },
    });

    return {
      success: true,
      message: 'Alert acknowledgement cleared successfully',
      data: cleared,
    };
  }
}
