import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from '../common/entities/building.entity';
import { Equipment } from '../common/entities/equipment.entity';
import { MaintenanceReport } from '../common/entities/maintenance-report.entity';
import { Schedule } from '../common/entities/schedule.entity';
import { Technician } from '../common/entities/technician.entity';
import {
  CreateScheduleDto,
  ListSchedulesQueryDto,
  UpdateScheduleDto,
} from './dto/admin-schedule.dto';

@Injectable()
export class SchedulesService implements OnModuleInit {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(Building)
    private readonly buildingRepository: Repository<Building>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
    @InjectRepository(Technician)
    private readonly technicianRepository: Repository<Technician>,
    @InjectRepository(MaintenanceReport)
    private readonly reportRepository: Repository<MaintenanceReport>,
  ) {}

  private normalizeOptionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private applyEffectiveStatus(schedule: Schedule): Schedule {
    if (
      schedule.isActive &&
      schedule.status === 'scheduled' &&
      new Date(schedule.scheduledDate).getTime() < Date.now()
    ) {
      schedule.status = 'overdue';
    }

    return schedule;
  }

  async onModuleInit(): Promise<void> {
    const scheduleCount = await this.scheduleRepository.count();
    if (scheduleCount > 0) {
      return;
    }

    const [building] = await this.buildingRepository.find({
      order: { name: 'ASC' },
      take: 1,
    });

    if (!building) {
      return;
    }

    const equipment = await this.equipmentRepository.find({
      where: { building: { id: building.id } },
      relations: ['building'],
      order: { equipmentCode: 'ASC' },
      take: 2,
    });

    const technicians = await this.technicianRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
      take: 2,
    });

    await this.scheduleRepository.save([
      {
        building,
        equipment: equipment[0] ?? null,
        assignedTechnician: technicians[0] ?? null,
        title: 'Monthly PM Visit',
        maintenanceType: 'Preventive Maintenance',
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: 'scheduled',
        priority: 'Medium',
        recurrenceRule: 'Monthly',
        notes: 'Standard PM checklist and safety inspection.',
        isActive: true,
      },
      {
        building,
        equipment: equipment[1] ?? equipment[0] ?? null,
        assignedTechnician: technicians[1] ?? technicians[0] ?? null,
        title: 'Quarterly Safety Review',
        maintenanceType: 'Safety Inspection',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'scheduled',
        priority: 'High',
        recurrenceRule: 'Quarterly',
        notes: 'Review emergency operation, doors, and panel alarms.',
        isActive: true,
      },
    ]);
  }

  private async findOneWithRelations(id: string): Promise<Schedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
      relations: ['building', 'equipment', 'assignedTechnician', 'linkedReport'],
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
  }

  async findAll(query: ListSchedulesQueryDto): Promise<Schedule[]> {
    const scheduleQuery = this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.building', 'building')
      .leftJoinAndSelect('schedule.equipment', 'equipment')
      .leftJoinAndSelect('schedule.assignedTechnician', 'assignedTechnician')
      .leftJoinAndSelect('schedule.linkedReport', 'linkedReport')
      .orderBy('schedule.scheduledDate', 'ASC');

    if (query.activeOnly) {
      scheduleQuery.andWhere('schedule.isActive = :isActive', { isActive: true });
    }

    if (query.buildingId) {
      scheduleQuery.andWhere('building.id = :buildingId', { buildingId: query.buildingId });
    }

    if (query.equipmentId) {
      scheduleQuery.andWhere('equipment.id = :equipmentId', { equipmentId: query.equipmentId });
    }

    if (query.technicianId) {
      scheduleQuery.andWhere('assignedTechnician.id = :technicianId', {
        technicianId: query.technicianId,
      });
    }

    if (query.search?.trim()) {
      scheduleQuery.andWhere(
        `(
          schedule.title ILIKE :search OR
          schedule.maintenanceType ILIKE :search OR
          schedule.notes ILIKE :search OR
          building.name ILIKE :search OR
          equipment.equipmentCode ILIKE :search OR
          assignedTechnician.name ILIKE :search
        )`,
        { search: `%${query.search.trim()}%` },
      );
    }

    const schedules = (await scheduleQuery.getMany()).map((item) =>
      this.applyEffectiveStatus(item),
    );

    if (query.status) {
      return schedules.filter((item) => item.status === query.status);
    }

    return schedules;
  }

  private async resolveScheduleRelations(input: {
    buildingId: string;
    equipmentId?: string;
    assignedTechnicianId?: string;
    linkedReportCode?: string;
  }): Promise<{
    building: Building;
    equipment: Equipment | null;
    assignedTechnician: Technician | null;
    linkedReport: MaintenanceReport | null;
  }> {
    const building = await this.buildingRepository.findOne({
      where: { id: input.buildingId },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    let equipment: Equipment | null = null;
    if (input.equipmentId) {
      equipment = await this.equipmentRepository.findOne({
        where: { id: input.equipmentId },
        relations: ['building'],
      });

      if (!equipment || equipment.building.id !== building.id) {
        throw new NotFoundException('Equipment not found for selected building');
      }
    }

    let assignedTechnician: Technician | null = null;
    if (input.assignedTechnicianId) {
      assignedTechnician = await this.technicianRepository.findOne({
        where: { id: input.assignedTechnicianId },
      });

      if (!assignedTechnician) {
        throw new NotFoundException('Assigned technician not found');
      }
    }

    let linkedReport: MaintenanceReport | null = null;
    const normalizedReportCode = input.linkedReportCode?.trim();
    if (normalizedReportCode) {
      linkedReport = await this.reportRepository.findOne({
        where: { reportCode: normalizedReportCode },
      });

      if (!linkedReport) {
        throw new NotFoundException('Linked maintenance report not found');
      }
    }

    return { building, equipment, assignedTechnician, linkedReport };
  }

  async findOne(id: string): Promise<Schedule> {
    return this.applyEffectiveStatus(await this.findOneWithRelations(id));
  }

  async create(payload: CreateScheduleDto): Promise<Schedule> {
    const { building, equipment, assignedTechnician, linkedReport } = await this.resolveScheduleRelations({
      buildingId: payload.buildingId,
      equipmentId: payload.equipmentId,
      assignedTechnicianId: payload.assignedTechnicianId,
      linkedReportCode: payload.linkedReportCode,
    });

    const schedule = this.scheduleRepository.create({
      building,
      equipment,
      assignedTechnician,
      linkedReport,
      title: payload.title.trim(),
      maintenanceType: payload.maintenanceType.trim(),
      scheduledDate: new Date(payload.scheduledDate),
      status: payload.status ?? 'scheduled',
      priority: payload.priority ?? 'Medium',
      recurrenceRule: this.normalizeOptionalText(payload.recurrenceRule),
      notes: this.normalizeOptionalText(payload.notes),
      isActive: payload.isActive ?? true,
    });

    return this.applyEffectiveStatus(await this.scheduleRepository.save(schedule));
  }

  async update(id: string, payload: UpdateScheduleDto): Promise<Schedule> {
    const schedule = await this.findOneWithRelations(id);

    if (
      payload.buildingId !== undefined ||
      payload.equipmentId !== undefined ||
      payload.assignedTechnicianId !== undefined ||
      payload.linkedReportCode !== undefined
    ) {
      const { building, equipment, assignedTechnician, linkedReport } = await this.resolveScheduleRelations({
        buildingId: payload.buildingId ?? schedule.building.id,
        equipmentId: payload.equipmentId ?? schedule.equipment?.id,
        assignedTechnicianId: payload.assignedTechnicianId ?? schedule.assignedTechnician?.id,
        linkedReportCode:
          payload.linkedReportCode !== undefined
            ? payload.linkedReportCode
            : schedule.linkedReport?.reportCode ?? undefined,
      });

      schedule.building = building;
      schedule.equipment = equipment;
      schedule.assignedTechnician = assignedTechnician;
      schedule.linkedReport = linkedReport;
    }

    if (payload.title !== undefined) {
      schedule.title = payload.title.trim();
    }
    if (payload.maintenanceType !== undefined) {
      schedule.maintenanceType = payload.maintenanceType.trim();
    }
    if (payload.scheduledDate !== undefined) {
      schedule.scheduledDate = new Date(payload.scheduledDate);
    }
    if (payload.status !== undefined) {
      schedule.status = payload.status;
    }
    if (payload.priority !== undefined) {
      schedule.priority = payload.priority;
    }
    if (payload.recurrenceRule !== undefined) {
      schedule.recurrenceRule = this.normalizeOptionalText(payload.recurrenceRule);
    }
    if (payload.notes !== undefined) {
      schedule.notes = this.normalizeOptionalText(payload.notes);
    }
    if (payload.isActive !== undefined) {
      schedule.isActive = payload.isActive;
    }

    return this.applyEffectiveStatus(await this.scheduleRepository.save(schedule));
  }

  async remove(id: string): Promise<void> {
    const schedule = await this.findOneWithRelations(id);
    await this.scheduleRepository.remove(schedule);
  }
}
