import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuditLog } from '../common/entities/audit-log.entity';
import { AuditService } from './audit.service';
import { ListAuditLogsQueryDto } from './dto/admin-audit-log.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('audit/admin')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  private serializeAuditLog(entry: AuditLog) {
    return {
      id: entry.id,
      actorUserId: entry.actorUserId,
      actorEmail: entry.actorEmail,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      resourceLabel: entry.resourceLabel,
      details: entry.details,
      createdAt: entry.createdAt,
    };
  }

  @Get()
  async findAll(@Query() query: ListAuditLogsQueryDto) {
    const data = await this.auditService.findAll(query);

    return {
      success: true,
      total: data.length,
      data: data.map((entry) => this.serializeAuditLog(entry)),
    };
  }
}
