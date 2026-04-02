import { randomBytes } from 'crypto';
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMaintenanceReportDto } from '../common/dto/create-maintenance-report.dto';
import { Building } from '../common/entities/building.entity';
import { Equipment } from '../common/entities/equipment.entity';
import { MaintenanceReport } from '../common/entities/maintenance-report.entity';

const REPORT_CODE_PREFIX = 'MSR';
const REPORT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REPORT_CODE_LENGTH = 8;
const REPORT_CODE_MAX_ATTEMPTS = 10;

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

    const report = this.reportRepository.create({
      building,
      equipment,
      reportCode: await this.generateUniqueReportCode(),
      maintenanceType: payload.maintenanceType,
      arrivalDateTime: new Date(payload.arrivalDateTime),
      technicianName: payload.technicianName,
      findings: payload.findings ?? null,
      workPerformed: payload.workPerformed ?? null,
      partsUsed:
        payload.partsUsed?.map((part) => ({
          name: part.name,
          quantity: Number(part.quantity),
        })) ?? null,
      remarks: payload.remarks ?? null,
    });

    return this.reportRepository.save(report);
  }
}
