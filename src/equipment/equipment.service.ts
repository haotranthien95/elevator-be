import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from '../common/entities/building.entity';
import { Equipment } from '../common/entities/equipment.entity';
import {
  CreateBuildingDto,
  CreateEquipmentAdminDto,
  ListAdminEquipmentQueryDto,
  UpdateBuildingDto,
  UpdateEquipmentAdminDto,
} from './dto/admin-master-data.dto';

@Injectable()
export class EquipmentService implements OnModuleInit {
  constructor(
    @InjectRepository(Building)
    private readonly buildingRepository: Repository<Building>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
  ) {}

  private normalizeOptionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  async onModuleInit(): Promise<void> {
    const buildingCount = await this.buildingRepository.count();
    if (buildingCount > 0) {
      return;
    }

    const [buildingA, buildingB] = await this.buildingRepository.save([
      {
        name: 'YOMA Tower, Yangon',
        code: 'YGN-YOMA',
        address: 'Downtown Yangon',
        contactName: 'Daw Thinzar',
        contactPhone: '09-420000111',
        isActive: true,
      },
      {
        name: 'Century Center, Mandalay',
        code: 'MDY-CENTURY',
        address: '78th Street, Mandalay',
        contactName: 'U Kyaw Soe',
        contactPhone: '09-420000222',
        isActive: true,
      },
    ]);

    await this.equipmentRepository.save([
      {
        equipmentType: 'Elevator',
        equipmentCode: 'ELV-001',
        serialNumber: 'SN-YGN-001',
        brand: 'Mitsubishi',
        model: 'NexWay',
        location: 'Tower A - Lobby',
        isActive: true,
        building: buildingA,
      },
      {
        equipmentType: 'Elevator',
        equipmentCode: 'ELV-002',
        serialNumber: 'SN-YGN-002',
        brand: 'Hitachi',
        model: 'Sigma',
        location: 'Tower B - Service Core',
        isActive: true,
        building: buildingA,
      },
      {
        equipmentType: 'Escalator',
        equipmentCode: 'ESC-010',
        serialNumber: 'SN-MDY-010',
        brand: 'Otis',
        model: 'Transit',
        location: 'North Wing Entrance',
        isActive: true,
        building: buildingB,
      },
    ]);
  }

  async getBuildings(): Promise<Building[]> {
    return this.buildingRepository.find({ order: { name: 'ASC' } });
  }

  async getAdminBuildings(): Promise<Building[]> {
    return this.buildingRepository.find({
      relations: ['equipment'],
      order: { name: 'ASC' },
    });
  }

  async createBuilding(payload: CreateBuildingDto): Promise<Building> {
    const building = this.buildingRepository.create({
      name: payload.name.trim(),
      code: this.normalizeOptionalText(payload.code),
      address: this.normalizeOptionalText(payload.address),
      contactName: this.normalizeOptionalText(payload.contactName),
      contactPhone: this.normalizeOptionalText(payload.contactPhone),
      isActive: payload.isActive ?? true,
    });

    return this.buildingRepository.save(building);
  }

  async updateBuilding(id: string, payload: UpdateBuildingDto): Promise<Building> {
    const building = await this.buildingRepository.findOne({
      where: { id },
      relations: ['equipment'],
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    if (payload.name !== undefined) {
      building.name = payload.name.trim();
    }
    if (payload.code !== undefined) {
      building.code = this.normalizeOptionalText(payload.code);
    }
    if (payload.address !== undefined) {
      building.address = this.normalizeOptionalText(payload.address);
    }
    if (payload.contactName !== undefined) {
      building.contactName = this.normalizeOptionalText(payload.contactName);
    }
    if (payload.contactPhone !== undefined) {
      building.contactPhone = this.normalizeOptionalText(payload.contactPhone);
    }
    if (payload.isActive !== undefined) {
      building.isActive = payload.isActive;
    }

    return this.buildingRepository.save(building);
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

  async getAdminEquipmentList(query: ListAdminEquipmentQueryDto): Promise<Equipment[]> {
    const equipmentQuery = this.equipmentRepository
      .createQueryBuilder('equipment')
      .leftJoinAndSelect('equipment.building', 'building')
      .orderBy('building.name', 'ASC')
      .addOrderBy('equipment.equipmentCode', 'ASC');

    if (query.buildingId) {
      equipmentQuery.andWhere('building.id = :buildingId', {
        buildingId: query.buildingId,
      });
    }

    if (query.equipmentType?.trim()) {
      equipmentQuery.andWhere('equipment.equipmentType ILIKE :equipmentType', {
        equipmentType: `%${query.equipmentType.trim()}%`,
      });
    }

    if (query.search?.trim()) {
      equipmentQuery.andWhere(
        '(equipment.equipmentCode ILIKE :search OR equipment.brand ILIKE :search OR equipment.model ILIKE :search OR equipment.location ILIKE :search OR building.name ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    return equipmentQuery.getMany();
  }

  async createEquipment(payload: CreateEquipmentAdminDto): Promise<Equipment> {
    const building = await this.buildingRepository.findOne({
      where: { id: payload.buildingId },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const equipment = this.equipmentRepository.create({
      building,
      equipmentType: payload.equipmentType.trim(),
      equipmentCode: payload.equipmentCode.trim(),
      serialNumber: this.normalizeOptionalText(payload.serialNumber),
      brand: this.normalizeOptionalText(payload.brand),
      model: this.normalizeOptionalText(payload.model),
      location: this.normalizeOptionalText(payload.location),
      isActive: payload.isActive ?? true,
    });

    return this.equipmentRepository.save(equipment);
  }

  async updateEquipment(
    id: string,
    payload: UpdateEquipmentAdminDto,
  ): Promise<Equipment> {
    const equipment = await this.equipmentRepository.findOne({
      where: { id },
      relations: ['building'],
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    if (payload.buildingId && payload.buildingId !== equipment.building.id) {
      const building = await this.buildingRepository.findOne({
        where: { id: payload.buildingId },
      });

      if (!building) {
        throw new NotFoundException('Building not found');
      }

      equipment.building = building;
    }

    if (payload.equipmentType !== undefined) {
      equipment.equipmentType = payload.equipmentType.trim();
    }
    if (payload.equipmentCode !== undefined) {
      equipment.equipmentCode = payload.equipmentCode.trim();
    }
    if (payload.serialNumber !== undefined) {
      equipment.serialNumber = this.normalizeOptionalText(payload.serialNumber);
    }
    if (payload.brand !== undefined) {
      equipment.brand = this.normalizeOptionalText(payload.brand);
    }
    if (payload.model !== undefined) {
      equipment.model = this.normalizeOptionalText(payload.model);
    }
    if (payload.location !== undefined) {
      equipment.location = this.normalizeOptionalText(payload.location);
    }
    if (payload.isActive !== undefined) {
      equipment.isActive = payload.isActive;
    }

    return this.equipmentRepository.save(equipment);
  }
}
