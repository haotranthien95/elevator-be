import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from '../common/entities/building.entity';
import { Equipment } from '../common/entities/equipment.entity';

@Injectable()
export class EquipmentService implements OnModuleInit {
  constructor(
    @InjectRepository(Building)
    private readonly buildingRepository: Repository<Building>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
  ) {}

  async onModuleInit(): Promise<void> {
    const buildingCount = await this.buildingRepository.count();
    if (buildingCount > 0) {
      return;
    }

    const [buildingA, buildingB] = await this.buildingRepository.save([
      { name: 'YOMA Tower, Yangon' },
      { name: 'Century Center, Mandalay' },
    ]);

    await this.equipmentRepository.save([
      {
        equipmentType: 'Elevator',
        equipmentCode: 'ELV-001',
        building: buildingA,
      },
      {
        equipmentType: 'Elevator',
        equipmentCode: 'ELV-002',
        building: buildingA,
      },
      {
        equipmentType: 'Escalator',
        equipmentCode: 'ESC-010',
        building: buildingB,
      },
    ]);
  }

  async getBuildings(): Promise<Building[]> {
    return this.buildingRepository.find({ order: { name: 'ASC' } });
  }

  async getEquipmentTypes(): Promise<Array<{ equipmentType: string }>> {
    return this.equipmentRepository
      .createQueryBuilder('equipment')
      .select('equipment.equipmentType', 'equipmentType')
      .distinct(true)
      .orderBy('equipment.equipmentType', 'ASC')
      .getRawMany();
  }

  async getEquipmentByBuilding(
    buildingId: string,
    equipmentType?: string,
  ): Promise<Equipment[]> {
    const query = this.equipmentRepository
      .createQueryBuilder('equipment')
      .leftJoinAndSelect('equipment.building', 'building')
      .where('building.id = :buildingId', { buildingId })
      .orderBy('equipment.equipmentCode', 'ASC');

    if (equipmentType) {
      query.andWhere('equipment.equipmentType = :equipmentType', { equipmentType });
    }

    return query.getMany();
  }
}
