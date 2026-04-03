import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertAcknowledgement } from '../common/entities/alert-acknowledgement.entity';
import { MaintenanceReport } from '../common/entities/maintenance-report.entity';
import { Schedule } from '../common/entities/schedule.entity';
import { AcknowledgeAlertDto } from './dto/acknowledge-alert.dto';
import { AlertsQueryDto } from './dto/alerts-query.dto';

const DISPATCH_REPORT_STATUSES = new Set(['pending', 'scheduled', 'active', 'submitted']);
const REVIEW_ALERT_STATUSES = new Set(['submitted', 'pc-review', 'comm-review']);

type AlertActor = {
  sub?: string;
  email?: string;
  name?: string;
  role?: string;
};

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(MaintenanceReport)
    private readonly reportRepository: Repository<MaintenanceReport>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(AlertAcknowledgement)
    private readonly alertAcknowledgementRepository: Repository<AlertAcknowledgement>,
  ) {}

  private normalizeThresholds(query: AlertsQueryDto) {
    return {
      dueWithinHours: Math.min(query.dueWithinHours ?? 24, 168),
      staleAfterHours: Math.min(query.staleAfterHours ?? 24, 168),
      escalateAfterHours: Math.min(query.escalateAfterHours ?? 48, 336),
      limit: Math.min(query.limit ?? 6, 20),
    };
  }

  private normalizeOptionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private buildAlertKey(alertType: string, resourceId: string) {
    return `${alertType.trim()}:${resourceId.trim()}`;
  }

  private getEffectiveScheduleStatus(schedule: Schedule) {
    if (
      schedule.isActive &&
      schedule.status === 'scheduled' &&
      new Date(schedule.scheduledDate).getTime() < Date.now()
    ) {
      return 'overdue';
    }

    return schedule.status;
  }

  private toHours(durationMs: number) {
    return Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10;
  }

  private getPriorityRank(priority?: string | null) {
    switch ((priority ?? '').toLowerCase()) {
      case 'critical':
        return 0;
      case 'high':
        return 1;
      case 'medium':
        return 2;
      default:
        return 3;
    }
  }

  private async loadActiveAcknowledgements(now: Date) {
    return this.alertAcknowledgementRepository
      .createQueryBuilder('ack')
      .where('ack.snoozedUntil IS NULL OR ack.snoozedUntil > :now', { now })
      .orderBy('ack.updatedAt', 'DESC')
      .take(200)
      .getMany();
  }

  async acknowledgeAlert(
    payload: AcknowledgeAlertDto,
    actor?: AlertActor | null,
  ): Promise<AlertAcknowledgement> {
    const alertKey = this.buildAlertKey(payload.alertType, payload.resourceId);
    const existing = await this.alertAcknowledgementRepository.findOne({
      where: { alertKey },
    });
    const now = new Date();
    const snoozedUntil = payload.snoozeHours
      ? new Date(now.getTime() + payload.snoozeHours * 60 * 60 * 1000)
      : null;

    const entry = existing ?? this.alertAcknowledgementRepository.create({ alertKey });
    entry.alertKey = alertKey;
    entry.alertType = payload.alertType;
    entry.resourceType = payload.resourceType;
    entry.resourceId = payload.resourceId.trim();
    entry.resourceLabel = this.normalizeOptionalText(payload.resourceLabel);
    entry.status = snoozedUntil ? 'snoozed' : 'acknowledged';
    entry.note = this.normalizeOptionalText(payload.note);
    entry.snoozedUntil = snoozedUntil;
    entry.acknowledgedAt = now;
    entry.actorUserId = actor?.sub?.trim() || null;
    entry.actorEmail = actor?.email?.trim() || null;
    entry.actorName = actor?.name?.trim() || null;
    entry.actorRole = actor?.role?.trim() || null;

    return this.alertAcknowledgementRepository.save(entry);
  }

  async clearAcknowledgement(alertType: string, resourceId: string) {
    const alertKey = this.buildAlertKey(alertType, resourceId);
    const existing = await this.alertAcknowledgementRepository.findOne({
      where: { alertKey },
    });

    if (!existing) {
      return null;
    }

    await this.alertAcknowledgementRepository.remove(existing);
    return existing;
  }

  async getSummary(query: AlertsQueryDto) {
    const thresholds = this.normalizeThresholds(query);
    const now = new Date();
    const nowMs = now.getTime();
    const dueSoonCutoffMs = nowMs + thresholds.dueWithinHours * 60 * 60 * 1000;

    const [reports, schedules, activeAcknowledgements] = await Promise.all([
      this.reportRepository
        .createQueryBuilder('report')
        .leftJoinAndSelect('report.building', 'building')
        .leftJoinAndSelect('report.equipment', 'equipment')
        .leftJoinAndSelect('report.assignedTechnician', 'assignedTechnician')
        .orderBy('report.updatedAt', 'DESC')
        .take(500)
        .getMany(),
      this.scheduleRepository
        .createQueryBuilder('schedule')
        .leftJoinAndSelect('schedule.building', 'building')
        .leftJoinAndSelect('schedule.equipment', 'equipment')
        .leftJoinAndSelect('schedule.assignedTechnician', 'assignedTechnician')
        .leftJoinAndSelect('schedule.linkedReport', 'linkedReport')
        .orderBy('schedule.scheduledDate', 'ASC')
        .take(500)
        .getMany(),
      this.loadActiveAcknowledgements(now),
    ]);

    const hiddenAlertKeys = new Set(activeAcknowledgements.map((item) => item.alertKey));

    const scheduleItems = schedules
      .map((schedule) => {
        const scheduledTime = new Date(schedule.scheduledDate).getTime();
        return {
          schedule,
          scheduledTime,
          status: this.getEffectiveScheduleStatus(schedule),
        };
      })
      .filter((item) => item.schedule.isActive && !Number.isNaN(item.scheduledTime));

    const dueSoonSchedulesAll = scheduleItems
      .filter(
        (item) =>
          item.status === 'scheduled' &&
          item.scheduledTime >= nowMs &&
          item.scheduledTime <= dueSoonCutoffMs,
      )
      .sort((left, right) => left.scheduledTime - right.scheduledTime);

    const overdueSchedulesAll = scheduleItems
      .filter((item) => item.status === 'overdue')
      .sort((left, right) => left.scheduledTime - right.scheduledTime);

    const overdueEscalationsAll = overdueSchedulesAll.filter(
      (item) => nowMs - item.scheduledTime >= thresholds.escalateAfterHours * 60 * 60 * 1000,
    );

    const dispatchAlertsAll = reports
      .filter(
        (report) =>
          DISPATCH_REPORT_STATUSES.has(report.status) &&
          !report.assignedTechnician &&
          !report.assignedTo?.trim(),
      )
      .sort((left, right) => {
        const priorityGap = this.getPriorityRank(left.priority) - this.getPriorityRank(right.priority);
        if (priorityGap !== 0) {
          return priorityGap;
        }

        return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
      });

    const staleReviewsAll = reports
      .map((report) => {
        const referenceTime = new Date(report.updatedAt ?? report.submittedAt).getTime();
        return {
          report,
          referenceTime,
          hoursWaiting: Number.isNaN(referenceTime) ? 0 : this.toHours(nowMs - referenceTime),
        };
      })
      .filter(
        (item) =>
          REVIEW_ALERT_STATUSES.has(item.report.status) &&
          item.hoursWaiting >= thresholds.staleAfterHours,
      )
      .sort((left, right) => right.hoursWaiting - left.hoursWaiting);

    const dueSoonSchedules = dueSoonSchedulesAll.filter(
      (item) => !hiddenAlertKeys.has(this.buildAlertKey('due-soon-schedule', item.schedule.id)),
    );
    const overdueEscalations = overdueEscalationsAll.filter(
      (item) => !hiddenAlertKeys.has(this.buildAlertKey('overdue-escalation', item.schedule.id)),
    );
    const dispatchAlerts = dispatchAlertsAll.filter(
      (report) => !hiddenAlertKeys.has(this.buildAlertKey('dispatch-alert', report.id)),
    );
    const staleReviews = staleReviewsAll.filter(
      (item) => !hiddenAlertKeys.has(this.buildAlertKey('stale-review', item.report.id)),
    );

    return {
      generatedAt: now.toISOString(),
      thresholds,
      overview: {
        dueSoonSchedules: dueSoonSchedules.length,
        overdueSchedules: overdueSchedulesAll.length,
        escalatedSchedules: overdueEscalations.length,
        unassignedReports: dispatchAlerts.length,
        criticalUnassignedReports: dispatchAlerts.filter(
          (item) => item.priority === 'Critical',
        ).length,
        staleReviewReports: staleReviews.length,
        acknowledgedItems: activeAcknowledgements.length,
        attentionItems:
          overdueEscalations.length +
          dispatchAlerts.length +
          staleReviews.length +
          dueSoonSchedules.length,
      },
      dueSoonSchedules: dueSoonSchedules.slice(0, thresholds.limit).map((item) => ({
        id: item.schedule.id,
        title: item.schedule.title,
        building: item.schedule.building?.name ?? 'Unknown building',
        equipmentCode: item.schedule.equipment?.equipmentCode ?? null,
        technician: item.schedule.assignedTechnician?.name ?? null,
        priority: item.schedule.priority,
        scheduledDate: item.schedule.scheduledDate,
        recurrenceRule: item.schedule.recurrenceRule,
        linkedReportCode: item.schedule.linkedReport?.reportCode ?? null,
        hoursUntil: this.toHours(item.scheduledTime - nowMs),
      })),
      overdueEscalations: overdueEscalations.slice(0, thresholds.limit).map((item) => {
        const hoursPastDue = this.toHours(nowMs - item.scheduledTime);
        return {
          id: item.schedule.id,
          title: item.schedule.title,
          building: item.schedule.building?.name ?? 'Unknown building',
          equipmentCode: item.schedule.equipment?.equipmentCode ?? null,
          technician: item.schedule.assignedTechnician?.name ?? null,
          priority: item.schedule.priority,
          scheduledDate: item.schedule.scheduledDate,
          linkedReportCode: item.schedule.linkedReport?.reportCode ?? null,
          hoursPastDue,
          escalationLevel:
            hoursPastDue >= thresholds.escalateAfterHours * 2 ? 'critical' : 'warning',
        };
      }),
      dispatchAlerts: dispatchAlerts.slice(0, thresholds.limit).map((report) => ({
        id: report.id,
        reportCode: report.reportCode,
        reportLabel: report.reportCode ?? `Pending-${report.id.slice(0, 8)}`,
        building: report.building?.name ?? 'Unknown building',
        equipmentCode: report.equipment?.equipmentCode ?? null,
        priority: report.priority,
        status: report.status,
        submittedAt: report.submittedAt,
        hoursOpen: this.toHours(nowMs - new Date(report.submittedAt).getTime()),
      })),
      staleReviews: staleReviews.slice(0, thresholds.limit).map((item) => ({
        id: item.report.id,
        reportCode: item.report.reportCode,
        reportLabel: item.report.reportCode ?? `Pending-${item.report.id.slice(0, 8)}`,
        building: item.report.building?.name ?? 'Unknown building',
        priority: item.report.priority,
        status: item.report.status,
        owner:
          item.report.assignedTechnician?.name ?? item.report.assignedTo?.trim() ?? 'Unassigned',
        submittedAt: item.report.submittedAt,
        updatedAt: item.report.updatedAt,
        hoursWaiting: item.hoursWaiting,
      })),
      activeAcknowledgements: activeAcknowledgements.slice(0, thresholds.limit).map((item) => ({
        id: item.id,
        alertType: item.alertType,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        resourceLabel: item.resourceLabel,
        status: item.status,
        note: item.note,
        snoozedUntil: item.snoozedUntil,
        acknowledgedAt: item.acknowledgedAt,
        actorName: item.actorName,
      })),
    };
  }
}
