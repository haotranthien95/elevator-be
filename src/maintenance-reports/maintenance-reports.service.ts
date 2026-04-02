import { randomBytes, randomUUID } from 'crypto';
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMaintenanceReportDto } from '../common/dto/create-maintenance-report.dto';
import { Building } from '../common/entities/building.entity';
import { Equipment } from '../common/entities/equipment.entity';
import { MaintenanceReport } from '../common/entities/maintenance-report.entity';
import {
  AssignMaintenanceReportDto,
  CreateMaintenanceReportNoteDto,
  ListMaintenanceReportsQueryDto,
  UpdateReportStatusDto,
} from './dto/admin-report-actions.dto';

const REPORT_CODE_PREFIX = 'MSR';
const REPORT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REPORT_CODE_LENGTH = 8;
const REPORT_CODE_MAX_ATTEMPTS = 10;
const INITIAL_REPORT_STATUS = 'pending';
const DEFAULT_REPORT_PRIORITY = 'Medium';

type ReportNoteKind = 'system' | 'dispatch' | 'review' | 'finance';

@Injectable()
export class MaintenanceReportsService {
  constructor(
    @InjectRepository(MaintenanceReport)
    private readonly reportRepository: Repository<MaintenanceReport>,
    @InjectRepository(Building)
    private readonly buildingRepository: Repository<Building>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
  ) {}

  private buildReportCode(): string {
    const bytes = randomBytes(REPORT_CODE_LENGTH);
    const randomPart = Array.from(bytes, (byte) =>
      REPORT_CODE_ALPHABET[byte % REPORT_CODE_ALPHABET.length],
    ).join('');

    return `${REPORT_CODE_PREFIX}-${randomPart}`;
  }

  private async generateUniqueReportCode(): Promise<string> {
    for (let attempt = 0; attempt < REPORT_CODE_MAX_ATTEMPTS; attempt += 1) {
      const reportCode = this.buildReportCode();
      const exists = await this.reportRepository.exists({ where: { reportCode } });

      if (!exists) {
        return reportCode;
      }
    }

    throw new InternalServerErrorException('Could not generate a unique report code');
  }

  private buildBaseQuery() {
    return this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.building', 'building')
      .leftJoinAndSelect('report.equipment', 'equipment');
  }

  private appendInternalNote(
    report: MaintenanceReport,
    input: { author: string; kind?: ReportNoteKind; text: string },
  ) {
    const nextNote = {
      id: randomUUID(),
      at: new Date().toISOString(),
      author: input.author.trim(),
      kind: input.kind ?? 'system',
      text: input.text.trim(),
    };

    report.internalNotes = [...(report.internalNotes ?? []), nextNote];
  }

  private async ensureReportCode(report: MaintenanceReport): Promise<MaintenanceReport> {
    if (report.reportCode?.trim()) {
      return report;
    }

    report.reportCode = await this.generateUniqueReportCode();
    return this.reportRepository.save(report);
  }

  async create(payload: CreateMaintenanceReportDto): Promise<MaintenanceReport> {
    const building = await this.buildingRepository.findOne({
      where: { id: payload.buildingId },
    });
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const equipment = await this.equipmentRepository.findOne({
      where: { id: payload.equipmentId },
      relations: ['building'],
    });

    if (!equipment || equipment.building.id !== building.id) {
      throw new NotFoundException('Equipment not found for selected building');
    }

    const normalizedPhotos =
      payload.photos
        ?.filter((photo) => photo.dataUrl.startsWith('data:image/'))
        .map((photo) => ({
          name: photo.name,
          mimeType: photo.mimeType,
          size: Number(photo.size),
          dataUrl: photo.dataUrl,
        })) ?? [];

    const report = this.reportRepository.create({
      building,
      equipment,
      reportCode: await this.generateUniqueReportCode(),
      maintenanceType: payload.maintenanceType,
      arrivalDateTime: new Date(payload.arrivalDateTime),
      technicianName: payload.technicianName,
      status: INITIAL_REPORT_STATUS,
      priority: DEFAULT_REPORT_PRIORITY,
      assignedTo: payload.technicianName,
      findings: payload.findings ?? null,
      workPerformed: payload.workPerformed ?? null,
      partsUsed:
        payload.partsUsed?.map((part) => ({
          name: part.name,
          quantity: Number(part.quantity),
        })) ?? null,
      remarks: payload.remarks ?? null,
      photos: normalizedPhotos.length > 0 ? normalizedPhotos : null,
      technicianSignature: payload.technicianSignature ?? null,
      customerSignature: payload.customerSignature ?? null,
      internalNotes: [
        {
          id: randomUUID(),
          at: new Date().toISOString(),
          author: 'SYSTEM',
          kind: 'system',
          text: 'Report submitted from the public maintenance form. Initial status set to pending.',
        },
      ],
    });

    return this.reportRepository.save(report);
  }

  async findAll(query: ListMaintenanceReportsQueryDto): Promise<MaintenanceReport[]> {
    const reportQuery = this.buildBaseQuery().orderBy('report.submittedAt', 'DESC');

    if (query.reportCode?.trim()) {
      reportQuery.andWhere('report.reportCode ILIKE :reportCode', {
        reportCode: `%${query.reportCode.trim()}%`,
      });
    }

    if (query.building?.trim()) {
      reportQuery.andWhere('building.name ILIKE :building', {
        building: `%${query.building.trim()}%`,
      });
    }

    if (query.equipmentType?.trim()) {
      reportQuery.andWhere('equipment.equipmentType ILIKE :equipmentType', {
        equipmentType: `%${query.equipmentType.trim()}%`,
      });
    }

    if (query.technician?.trim()) {
      reportQuery.andWhere('report.technicianName ILIKE :technician', {
        technician: `%${query.technician.trim()}%`,
      });
    }

    if (query.assignedTo?.trim()) {
      reportQuery.andWhere('report.assignedTo ILIKE :assignedTo', {
        assignedTo: `%${query.assignedTo.trim()}%`,
      });
    }

    if (query.status) {
      reportQuery.andWhere('report.status = :status', { status: query.status });
    }

    if (query.dateFrom) {
      reportQuery.andWhere('report.submittedAt >= :dateFrom', {
        dateFrom: new Date(query.dateFrom),
      });
    }

    if (query.dateTo) {
      const endDate = new Date(query.dateTo);
      endDate.setHours(23, 59, 59, 999);
      reportQuery.andWhere('report.submittedAt <= :dateTo', { dateTo: endDate });
    }

    reportQuery.take(Math.min(query.limit ?? 50, 100));

    const reports = await reportQuery.getMany();
    return Promise.all(reports.map((report) => this.ensureReportCode(report)));
  }

  async findOneByReportCode(reportCode: string): Promise<MaintenanceReport> {
    const report = await this.buildBaseQuery()
      .where('report.reportCode = :reportCode', { reportCode })
      .getOne();

    if (!report) {
      throw new NotFoundException('Maintenance report not found');
    }

    return this.ensureReportCode(report);
  }

  async updateStatus(
    reportCode: string,
    payload: UpdateReportStatusDto,
  ): Promise<MaintenanceReport> {
    const report = await this.findOneByReportCode(reportCode);
    report.status = payload.status;

    this.appendInternalNote(report, {
      author: payload.author?.trim() || 'Operations Team',
      kind:
        payload.status === 'pc-review' ||
        payload.status === 'comm-review' ||
        payload.status === 'invoice-ready'
          ? 'review'
          : 'dispatch',
      text: payload.note?.trim() || `Status updated to ${payload.status}.`,
    });

    return this.reportRepository.save(report);
  }

  async assign(
    reportCode: string,
    payload: AssignMaintenanceReportDto,
  ): Promise<MaintenanceReport> {
    const report = await this.findOneByReportCode(reportCode);
    report.assignedTo = payload.assignedTo.trim();
    report.priority = payload.priority ?? report.priority ?? DEFAULT_REPORT_PRIORITY;

    this.appendInternalNote(report, {
      author: payload.author?.trim() || 'Dispatcher',
      kind: 'dispatch',
      text:
        payload.note?.trim() ||
        `Assigned to ${report.assignedTo} with ${report.priority} priority.`,
    });

    return this.reportRepository.save(report);
  }

  async addNote(
    reportCode: string,
    payload: CreateMaintenanceReportNoteDto,
  ): Promise<MaintenanceReport> {
    const report = await this.findOneByReportCode(reportCode);

    this.appendInternalNote(report, {
      author: payload.author,
      kind: payload.kind ?? 'system',
      text: payload.text,
    });

    return this.reportRepository.save(report);
  }
}
