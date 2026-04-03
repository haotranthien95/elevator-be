import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../common/entities/audit-log.entity';
import { ListAuditLogsQueryDto } from './dto/admin-audit-log.dto';

type AuditActor = {
  sub?: string;
  email?: string;
  name?: string;
  role?: string;
};

type AuditRecordInput = {
  action: string;
  resourceType: string;
  resourceId?: string | null;
  resourceLabel?: string | null;
  details?: Record<string, unknown> | null;
  actor?: AuditActor | null;
};

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async record(input: AuditRecordInput): Promise<AuditLog> {
    const actor = input.actor ?? null;

    const entry = this.auditRepository.create({
      actorUserId: actor?.sub?.trim() || null,
      actorEmail: actor?.email?.trim() || null,
      actorName: actor?.name?.trim() || null,
      actorRole: actor?.role?.trim() || null,
      action: input.action.trim(),
      resourceType: input.resourceType.trim(),
      resourceId: input.resourceId?.trim() || null,
      resourceLabel: input.resourceLabel?.trim() || null,
      details: input.details ?? null,
    });

    return this.auditRepository.save(entry);
  }

  async recordFromActor(
    actor: AuditActor | undefined | null,
    input: Omit<AuditRecordInput, 'actor'>,
  ): Promise<AuditLog> {
    return this.record({ ...input, actor: actor ?? undefined });
  }

  async findAll(query: ListAuditLogsQueryDto): Promise<AuditLog[]> {
    const auditQuery = this.auditRepository
      .createQueryBuilder('audit')
      .orderBy('audit.createdAt', 'DESC');

    if (query.action?.trim()) {
      auditQuery.andWhere('audit.action = :action', {
        action: query.action.trim(),
      });
    }

    if (query.resourceType?.trim()) {
      auditQuery.andWhere('audit.resourceType = :resourceType', {
        resourceType: query.resourceType.trim(),
      });
    }

    if (query.actor?.trim()) {
      auditQuery.andWhere(
        '(audit.actorName ILIKE :actor OR audit.actorEmail ILIKE :actor)',
        { actor: `%${query.actor.trim()}%` },
      );
    }

    if (query.search?.trim()) {
      auditQuery.andWhere(
        `(
          audit.action ILIKE :search OR
          audit.resourceType ILIKE :search OR
          audit.resourceLabel ILIKE :search OR
          audit.actorName ILIKE :search OR
          audit.actorEmail ILIKE :search OR
          CAST(audit.details AS text) ILIKE :search
        )`,
        { search: `%${query.search.trim()}%` },
      );
    }

    if (query.dateFrom) {
      auditQuery.andWhere('audit.createdAt >= :dateFrom', {
        dateFrom: new Date(query.dateFrom),
      });
    }

    if (query.dateTo) {
      const endDate = new Date(query.dateTo);
      endDate.setHours(23, 59, 59, 999);
      auditQuery.andWhere('audit.createdAt <= :dateTo', { dateTo: endDate });
    }

    auditQuery.take(Math.min(query.limit ?? 100, 200));

    return auditQuery.getMany();
  }
}
