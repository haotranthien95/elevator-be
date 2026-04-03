import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../common/entities/audit-log.entity';
import { MaintenanceReport } from '../common/entities/maintenance-report.entity';
import { Schedule } from '../common/entities/schedule.entity';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

const OPEN_REPORT_STATUSES = new Set([
  'pending',
  'scheduled',
  'active',
  'submitted',
  'pc-review',
  'comm-review',
]);
const REVIEW_REPORT_STATUSES = new Set(['pc-review', 'comm-review']);
const CLOSED_REPORT_STATUSES = new Set(['invoice-ready']);
const ACTIVE_SCHEDULE_STATUSES = new Set(['scheduled', 'overdue', 'active']);
const DEFAULT_SLA_MINUTES = 60;

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(MaintenanceReport)
    private readonly reportRepository: Repository<MaintenanceReport>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  private normalizeRange(query: AnalyticsQueryDto) {
    const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();
    const safeDateTo = Number.isNaN(dateTo.getTime()) ? new Date() : dateTo;
    safeDateTo.setHours(23, 59, 59, 999);

    const fallbackDateFrom = new Date(safeDateTo);
    fallbackDateFrom.setDate(fallbackDateFrom.getDate() - 30);
    fallbackDateFrom.setHours(0, 0, 0, 0);

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : fallbackDateFrom;
    const safeDateFrom = Number.isNaN(dateFrom.getTime()) ? fallbackDateFrom : dateFrom;
    safeDateFrom.setHours(0, 0, 0, 0);

    return {
      dateFrom: safeDateFrom,
      dateTo: safeDateTo,
      granularity: query.granularity ?? 'daily',
      limit: Math.min(query.limit ?? 6, 12),
      slaMinutes: query.slaMinutes ?? DEFAULT_SLA_MINUTES,
    };
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

  private calculateResponseMinutes(report: MaintenanceReport) {
    if (!report.submittedAt || !report.arrivalDateTime) {
      return null;
    }

    const submittedTime = new Date(report.submittedAt).getTime();
    const arrivalTime = new Date(report.arrivalDateTime).getTime();
    if (Number.isNaN(submittedTime) || Number.isNaN(arrivalTime) || arrivalTime < submittedTime) {
      return null;
    }

    return Math.round((arrivalTime - submittedTime) / (1000 * 60));
  }

  private calculateWorkDurationHours(report: MaintenanceReport) {
    if (!report.arrivalDateTime || !report.updatedAt) {
      return null;
    }

    const arrivalTime = new Date(report.arrivalDateTime).getTime();
    const updatedTime = new Date(report.updatedAt).getTime();
    if (Number.isNaN(arrivalTime) || Number.isNaN(updatedTime) || updatedTime < arrivalTime) {
      return null;
    }

    return Math.round(((updatedTime - arrivalTime) / (1000 * 60 * 60)) * 10) / 10;
  }

  private startOfWeek(input: Date) {
    const date = new Date(input);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private buildTrendMeta(date: Date, granularity: 'daily' | 'weekly') {
    if (granularity === 'weekly') {
      const weekStart = this.startOfWeek(date);
      return {
        key: weekStart.toISOString().slice(0, 10),
        label: `Week of ${new Intl.DateTimeFormat('en-GB', {
          day: '2-digit',
          month: 'short',
        }).format(weekStart)}`,
      };
    }

    return {
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(date),
    };
  }

  private average(total: number, samples: number) {
    if (!samples) {
      return null;
    }

    return Math.round((total / samples) * 10) / 10;
  }

  private async loadReports(query: AnalyticsQueryDto) {
    const range = this.normalizeRange(query);
    const reportQuery = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.building', 'building')
      .leftJoinAndSelect('report.equipment', 'equipment')
      .leftJoinAndSelect('report.assignedTechnician', 'assignedTechnician')
      .where('report.submittedAt >= :dateFrom', { dateFrom: range.dateFrom })
      .andWhere('report.submittedAt <= :dateTo', { dateTo: range.dateTo })
      .orderBy('report.submittedAt', 'DESC')
      .take(500);

    return reportQuery.getMany();
  }

  private async loadSchedules(query: AnalyticsQueryDto) {
    const hasDateFilter = Boolean(query.dateFrom || query.dateTo);
    const range = this.normalizeRange(query);
    const scheduleQuery = this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.building', 'building')
      .leftJoinAndSelect('schedule.assignedTechnician', 'assignedTechnician')
      .leftJoinAndSelect('schedule.linkedReport', 'linkedReport')
      .orderBy('schedule.scheduledDate', 'DESC')
      .take(500);

    if (hasDateFilter) {
      scheduleQuery
        .where('schedule.scheduledDate >= :dateFrom', { dateFrom: range.dateFrom })
        .andWhere('schedule.scheduledDate <= :dateTo', { dateTo: range.dateTo });
    }

    return scheduleQuery.getMany();
  }

  private async loadAuditLogs(query: AnalyticsQueryDto) {
    const range = this.normalizeRange(query);
    return this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.createdAt >= :dateFrom', { dateFrom: range.dateFrom })
      .andWhere('audit.createdAt <= :dateTo', { dateTo: range.dateTo })
      .orderBy('audit.createdAt', 'DESC')
      .take(200)
      .getMany();
  }

  private buildOverview(reports: MaintenanceReport[], schedules: Schedule[], slaMinutes: number) {
    const responseValues = reports
      .map((report) => this.calculateResponseMinutes(report))
      .filter((value): value is number => value !== null);
    const workDurationValues = reports
      .map((report) => this.calculateWorkDurationHours(report))
      .filter((value): value is number => value !== null);

    const effectiveScheduleStatuses = schedules.map((schedule) => this.getEffectiveScheduleStatus(schedule));

    const openReports = reports.filter((report) => OPEN_REPORT_STATUSES.has(report.status)).length;
    const reviewBacklog = reports.filter((report) => REVIEW_REPORT_STATUSES.has(report.status)).length;
    const invoiceReady = reports.filter((report) => CLOSED_REPORT_STATUSES.has(report.status)).length;
    const slaMisses = responseValues.filter((value) => value > slaMinutes).length;
    const responseSampleCount = responseValues.length;
    const slaComplianceRate = responseSampleCount
      ? Math.round(((responseSampleCount - slaMisses) / responseSampleCount) * 100)
      : null;
    const completionRate = reports.length ? Math.round((invoiceReady / reports.length) * 100) : 0;

    return {
      totalReports: reports.length,
      openReports,
      reviewBacklog,
      invoiceReady,
      criticalOpen: reports.filter(
        (report) => report.priority === 'Critical' && OPEN_REPORT_STATUSES.has(report.status),
      ).length,
      dispatchNeeded: reports.filter(
        (report) => !report.assignedTechnician && !report.assignedTo?.trim() && OPEN_REPORT_STATUSES.has(report.status),
      ).length,
      scheduledVisits: effectiveScheduleStatuses.filter((status) => status === 'scheduled').length,
      overdueSchedules: effectiveScheduleStatuses.filter((status) => status === 'overdue').length,
      activeScheduleLoad: effectiveScheduleStatuses.filter((status) => ACTIVE_SCHEDULE_STATUSES.has(status)).length,
      avgResponseMinutes: this.average(
        responseValues.reduce((sum, value) => sum + value, 0),
        responseValues.length,
      ),
      avgWorkDurationHours: this.average(
        workDurationValues.reduce((sum, value) => sum + value, 0),
        workDurationValues.length,
      ),
      slaMisses,
      responseSampleCount,
      slaComplianceRate,
      completionRate,
      slaMinutes,
    };
  }

  private buildTrends(
    reports: MaintenanceReport[],
    granularity: 'daily' | 'weekly',
    limit: number,
    slaMinutes: number,
  ) {
    const buckets = new Map<
      string,
      {
        key: string;
        label: string;
        opened: number;
        reviewReady: number;
        closed: number;
        slaMisses: number;
        responseTotal: number;
        responseSamples: number;
        workTotal: number;
        workSamples: number;
      }
    >();

    for (const report of reports) {
      const sourceDate = new Date(report.submittedAt ?? report.createdAt);
      if (Number.isNaN(sourceDate.getTime())) {
        continue;
      }

      const trendMeta = this.buildTrendMeta(sourceDate, granularity);
      const bucket = buckets.get(trendMeta.key) ?? {
        key: trendMeta.key,
        label: trendMeta.label,
        opened: 0,
        reviewReady: 0,
        closed: 0,
        slaMisses: 0,
        responseTotal: 0,
        responseSamples: 0,
        workTotal: 0,
        workSamples: 0,
      };

      bucket.opened += 1;
      if (REVIEW_REPORT_STATUSES.has(report.status)) {
        bucket.reviewReady += 1;
      }
      if (CLOSED_REPORT_STATUSES.has(report.status)) {
        bucket.closed += 1;
      }

      const responseMinutes = this.calculateResponseMinutes(report);
      if (responseMinutes !== null) {
        bucket.responseTotal += responseMinutes;
        bucket.responseSamples += 1;
        if (responseMinutes > slaMinutes) {
          bucket.slaMisses += 1;
        }
      }

      const workDurationHours = this.calculateWorkDurationHours(report);
      if (workDurationHours !== null) {
        bucket.workTotal += workDurationHours;
        bucket.workSamples += 1;
      }

      buckets.set(trendMeta.key, bucket);
    }

    return Array.from(buckets.values())
      .sort((left, right) => left.key.localeCompare(right.key))
      .slice(-limit)
      .map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        opened: bucket.opened,
        reviewReady: bucket.reviewReady,
        closed: bucket.closed,
        slaMisses: bucket.slaMisses,
        avgResponseMinutes: this.average(bucket.responseTotal, bucket.responseSamples),
        avgWorkDurationHours: this.average(bucket.workTotal, bucket.workSamples),
      }));
  }

  private buildTechnicians(reports: MaintenanceReport[], schedules: Schedule[]) {
    const technicianMap = new Map<
      string,
      {
        name: string;
        team: string;
        openJobs: number;
        completedJobs: number;
        scheduledVisits: number;
        overdueVisits: number;
        responseTotal: number;
        responseSamples: number;
        workTotal: number;
        workSamples: number;
      }
    >();

    const ensureTechnician = (name: string, team?: string | null) => {
      const key = name.trim();
      const existing = technicianMap.get(key);
      if (existing) {
        if (!existing.team && team?.trim()) {
          existing.team = team.trim();
        }
        return existing;
      }

      const created = {
        name: key,
        team: team?.trim() || 'Field operations',
        openJobs: 0,
        completedJobs: 0,
        scheduledVisits: 0,
        overdueVisits: 0,
        responseTotal: 0,
        responseSamples: 0,
        workTotal: 0,
        workSamples: 0,
      };
      technicianMap.set(key, created);
      return created;
    };

    for (const report of reports) {
      const technicianName = report.assignedTechnician?.name ?? report.assignedTo ?? report.technicianName;
      if (!technicianName?.trim()) {
        continue;
      }

      const summary = ensureTechnician(technicianName, report.assignedTechnician?.team ?? null);
      if (OPEN_REPORT_STATUSES.has(report.status)) {
        summary.openJobs += 1;
      } else {
        summary.completedJobs += 1;
      }

      const responseMinutes = this.calculateResponseMinutes(report);
      if (responseMinutes !== null) {
        summary.responseTotal += responseMinutes;
        summary.responseSamples += 1;
      }

      const workDurationHours = this.calculateWorkDurationHours(report);
      if (workDurationHours !== null) {
        summary.workTotal += workDurationHours;
        summary.workSamples += 1;
      }
    }

    for (const schedule of schedules) {
      const technicianName = schedule.assignedTechnician?.name;
      if (!technicianName?.trim()) {
        continue;
      }

      const summary = ensureTechnician(technicianName, schedule.assignedTechnician?.team ?? null);
      const status = this.getEffectiveScheduleStatus(schedule);
      if (status === 'scheduled' || status === 'active' || status === 'overdue') {
        summary.scheduledVisits += 1;
      }
      if (status === 'overdue') {
        summary.overdueVisits += 1;
      }
    }

    return Array.from(technicianMap.values())
      .map((summary) => {
        const workloadScore = summary.openJobs * 14 + summary.scheduledVisits * 7 + summary.overdueVisits * 12;
        return {
          name: summary.name,
          team: summary.team,
          openJobs: summary.openJobs,
          completedJobs: summary.completedJobs,
          scheduledVisits: summary.scheduledVisits,
          overdueVisits: summary.overdueVisits,
          avgResponseMinutes: this.average(summary.responseTotal, summary.responseSamples),
          avgWorkDurationHours: this.average(summary.workTotal, summary.workSamples),
          utilization: `${Math.min(98, Math.max(32, 30 + workloadScore))}%`,
        };
      })
      .sort(
        (left, right) =>
          right.openJobs + right.overdueVisits * 2 + right.scheduledVisits -
          (left.openJobs + left.overdueVisits * 2 + left.scheduledVisits),
      )
      .slice(0, 8);
  }

  private buildBuildings(reports: MaintenanceReport[], schedules: Schedule[]) {
    const buildingMap = new Map<
      string,
      {
        building: string;
        tickets: number;
        openTickets: number;
        criticalTickets: number;
        reviewBacklog: number;
        overdueSchedules: number;
        responseTotal: number;
        responseSamples: number;
      }
    >();

    const ensureBuilding = (name?: string | null) => {
      const key = name?.trim() || 'Unknown building';
      const existing = buildingMap.get(key);
      if (existing) {
        return existing;
      }

      const created = {
        building: key,
        tickets: 0,
        openTickets: 0,
        criticalTickets: 0,
        reviewBacklog: 0,
        overdueSchedules: 0,
        responseTotal: 0,
        responseSamples: 0,
      };
      buildingMap.set(key, created);
      return created;
    };

    for (const report of reports) {
      const summary = ensureBuilding(report.building?.name);
      summary.tickets += 1;

      if (OPEN_REPORT_STATUSES.has(report.status)) {
        summary.openTickets += 1;
      }
      if (REVIEW_REPORT_STATUSES.has(report.status)) {
        summary.reviewBacklog += 1;
      }
      if (report.priority === 'Critical') {
        summary.criticalTickets += 1;
      }

      const responseMinutes = this.calculateResponseMinutes(report);
      if (responseMinutes !== null) {
        summary.responseTotal += responseMinutes;
        summary.responseSamples += 1;
      }
    }

    for (const schedule of schedules) {
      const summary = ensureBuilding(schedule.building?.name);
      if (this.getEffectiveScheduleStatus(schedule) === 'overdue') {
        summary.overdueSchedules += 1;
      }
    }

    return Array.from(buildingMap.values())
      .map((summary) => ({
        building: summary.building,
        tickets: summary.tickets,
        openTickets: summary.openTickets,
        criticalTickets: summary.criticalTickets,
        reviewBacklog: summary.reviewBacklog,
        overdueSchedules: summary.overdueSchedules,
        avgResponseMinutes: this.average(summary.responseTotal, summary.responseSamples),
        riskScore:
          summary.openTickets * 3 +
          summary.criticalTickets * 4 +
          summary.reviewBacklog * 2 +
          summary.overdueSchedules * 5,
      }))
      .sort((left, right) => right.riskScore - left.riskScore || right.tickets - left.tickets)
      .slice(0, 8);
  }

  private buildAuditActions(auditLogs: AuditLog[]) {
    const actionMap = new Map<string, number>();
    for (const entry of auditLogs) {
      actionMap.set(entry.action, (actionMap.get(entry.action) ?? 0) + 1);
    }

    return Array.from(actionMap.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 6);
  }

  async getSummary(query: AnalyticsQueryDto) {
    const range = this.normalizeRange(query);
    const [reports, schedules, auditLogs] = await Promise.all([
      this.loadReports(query),
      this.loadSchedules(query),
      this.loadAuditLogs(query),
    ]);

    return {
      range: {
        dateFrom: range.dateFrom.toISOString(),
        dateTo: range.dateTo.toISOString(),
        granularity: range.granularity,
        limit: range.limit,
        slaMinutes: range.slaMinutes,
      },
      overview: this.buildOverview(reports, schedules, range.slaMinutes),
      trends: this.buildTrends(reports, range.granularity, range.limit, range.slaMinutes),
      technicians: this.buildTechnicians(reports, schedules),
      buildings: this.buildBuildings(reports, schedules),
      auditActions: this.buildAuditActions(auditLogs),
    };
  }

  async getTrends(query: AnalyticsQueryDto) {
    const range = this.normalizeRange(query);
    const reports = await this.loadReports(query);

    return {
      range: {
        dateFrom: range.dateFrom.toISOString(),
        dateTo: range.dateTo.toISOString(),
        granularity: range.granularity,
        limit: range.limit,
        slaMinutes: range.slaMinutes,
      },
      trends: this.buildTrends(reports, range.granularity, range.limit, range.slaMinutes),
    };
  }

  async getTechnicians(query: AnalyticsQueryDto) {
    const range = this.normalizeRange(query);
    const [reports, schedules] = await Promise.all([
      this.loadReports(query),
      this.loadSchedules(query),
    ]);

    return {
      range: {
        dateFrom: range.dateFrom.toISOString(),
        dateTo: range.dateTo.toISOString(),
        granularity: range.granularity,
      },
      technicians: this.buildTechnicians(reports, schedules),
    };
  }

  async getBuildings(query: AnalyticsQueryDto) {
    const range = this.normalizeRange(query);
    const [reports, schedules] = await Promise.all([
      this.loadReports(query),
      this.loadSchedules(query),
    ]);

    return {
      range: {
        dateFrom: range.dateFrom.toISOString(),
        dateTo: range.dateTo.toISOString(),
        granularity: range.granularity,
      },
      buildings: this.buildBuildings(reports, schedules),
    };
  }
}
