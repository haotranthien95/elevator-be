import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Technician } from '../common/entities/technician.entity';
import {
  CreateTechnicianDto,
  ListTechniciansQueryDto,
  UpdateTechnicianDto,
} from './dto/admin-technician.dto';

@Injectable()
export class TechniciansService implements OnModuleInit {
  constructor(
    @InjectRepository(Technician)
    private readonly technicianRepository: Repository<Technician>,
  ) {}

  private normalizeOptionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  async onModuleInit(): Promise<void> {
    const technicianCount = await this.technicianRepository.count();
    if (technicianCount > 0) {
      return;
    }

    await this.technicianRepository.save([
      {
        name: 'Ko Aung Mya Oo',
        phone: '09-111111111',
        email: 'ko.aung@yoma.local',
        team: 'Team A',
        specialty: 'Elevator preventive maintenance',
        notes: 'Lead field technician for downtown sites.',
        isActive: true,
      },
      {
        name: 'Mya Thandar',
        phone: '09-222222222',
        email: 'mya.thandar@yoma.local',
        team: 'Team B',
        specialty: 'Escalator troubleshooting',
        notes: 'Handles retail and transport hub assets.',
        isActive: true,
      },
      {
        name: 'Zaw Min Tun',
        phone: '09-333333333',
        email: 'zaw.min@yoma.local',
        team: 'Night Support',
        specialty: 'Emergency call-out response',
        notes: 'Available for after-hours dispatch.',
        isActive: true,
      },
    ]);
  }

  async findAll(query: ListTechniciansQueryDto): Promise<Technician[]> {
    const technicianQuery = this.technicianRepository
      .createQueryBuilder('technician')
      .orderBy('technician.isActive', 'DESC')
      .addOrderBy('technician.name', 'ASC');

    if (query.activeOnly) {
      technicianQuery.andWhere('technician.isActive = :isActive', { isActive: true });
    }

    if (query.search?.trim()) {
      technicianQuery.andWhere(
        '(technician.name ILIKE :search OR technician.team ILIKE :search OR technician.specialty ILIKE :search OR technician.email ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    return technicianQuery.getMany();
  }

  async create(payload: CreateTechnicianDto): Promise<Technician> {
    const technician = this.technicianRepository.create({
      name: payload.name.trim(),
      phone: this.normalizeOptionalText(payload.phone),
      email: this.normalizeOptionalText(payload.email),
      team: this.normalizeOptionalText(payload.team),
      specialty: this.normalizeOptionalText(payload.specialty),
      notes: this.normalizeOptionalText(payload.notes),
      isActive: payload.isActive ?? true,
    });

    return this.technicianRepository.save(technician);
  }

  async update(id: string, payload: UpdateTechnicianDto): Promise<Technician> {
    const technician = await this.technicianRepository.findOne({ where: { id } });

    if (!technician) {
      throw new NotFoundException('Technician not found');
    }

    if (payload.name !== undefined) {
      technician.name = payload.name.trim();
    }
    if (payload.phone !== undefined) {
      technician.phone = this.normalizeOptionalText(payload.phone);
    }
    if (payload.email !== undefined) {
      technician.email = this.normalizeOptionalText(payload.email);
    }
    if (payload.team !== undefined) {
      technician.team = this.normalizeOptionalText(payload.team);
    }
    if (payload.specialty !== undefined) {
      technician.specialty = this.normalizeOptionalText(payload.specialty);
    }
    if (payload.notes !== undefined) {
      technician.notes = this.normalizeOptionalText(payload.notes);
    }
    if (payload.isActive !== undefined) {
      technician.isActive = payload.isActive;
    }

    return this.technicianRepository.save(technician);
  }
}
