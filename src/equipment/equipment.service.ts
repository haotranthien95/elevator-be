import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from '../common/entities/building.entity';
import { EquipmentType } from '../common/entities/equipment-type.entity';
import { Equipment } from '../common/entities/equipment.entity';
import {
  CreateBuildingDto,
  CreateEquipmentAdminDto,
  CreateEquipmentTypeDto,
  ListAdminEquipmentQueryDto,
  UpdateBuildingDto,
  UpdateEquipmentAdminDto,
  UpdateEquipmentTypeDto,
} from './dto/admin-master-data.dto';

@Injectable()
export class EquipmentService implements OnModuleInit {
  constructor(
    @InjectRepository(Building)
    private readonly buildingRepository: Repository<Building>,
    @InjectRepository(EquipmentType)
    private readonly equipmentTypeRepository: Repository<EquipmentType>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
  ) {}

  private normalizeOptionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private async findEquipmentTypeOrThrow(
    equipmentTypeId?: string,
    equipmentTypeName?: string,
  ): Promise<EquipmentType> {
    let equipmentType: EquipmentType | null = null;

    if (equipmentTypeId) {
      equipmentType = await this.equipmentTypeRepository.findOne({
        where: { id: equipmentTypeId },
      });
    }

    if (!equipmentType && equipmentTypeName?.trim()) {
      equipmentType = await this.equipmentTypeRepository
        .createQueryBuilder('equipmentType')
        .where('LOWER(equipmentType.name) = LOWER(:name)', {
          name: equipmentTypeName.trim(),
        })
        .getOne();
    }

    if (!equipmentType) {
      throw new NotFoundException(
        'Equipment type not found. Please create it in the Equipment Types library first.',
      );
    }

    return equipmentType;
  }

  private async syncEquipmentTypeRelations(): Promise<void> {
    const managedTypes = await this.equipmentTypeRepository.find();
    if (managedTypes.length === 0) {
      return;
    }

    const typeMap = new Map(
      managedTypes.map((item) => [item.name.trim().toLowerCase(), item]),
    );

    const equipmentItems = await this.equipmentRepository.find({
      relations: ['equipmentTypeInfo'],
    });

    const pendingUpdates = equipmentItems
      .filter((item) => !item.equipmentTypeInfo && item.equipmentType)
      .map((item) => {
        const match = typeMap.get(item.equipmentType.trim().toLowerCase());
        if (!match) {
          return null;
        }

        item.equipmentTypeInfo = match;
        item.equipmentType = match.name;
        return item;
      })
      .filter((item): item is Equipment => item !== null);

    if (pendingUpdates.length > 0) {
      await this.equipmentRepository.save(pendingUpdates);
    }
  }

  async onModuleInit(): Promise<void> {
    const equipmentTypeCount = await this.equipmentTypeRepository.count();
    if (equipmentTypeCount === 0) {
      await this.equipmentTypeRepository.save([
        {
          name: 'Elevator',
          code: 'ELEV',
          description: 'Passenger and service elevator systems',
          category: 'Vertical Transport',
          isActive: true,
        },
        {
          name: 'Escalator',
          code: 'ESCA',
          description: 'Escalator and moving walk systems',
          category: 'People Moving',
          isActive: true,
        },
        {
          name: 'Dumbwaiter',
          code: 'DUMB',
          description: 'Small goods lift equipment',
          category: 'Service Lift',
          isActive: true,
        },
      ]);
    }

    const allTypes = await this.equipmentTypeRepository.find();
    const typesByName = new Map(
      allTypes.map((item) => [item.name.trim().toLowerCase(), item]),
    );

    const buildingCount = await this.buildingRepository.count();
    if (buildingCount > 0) {
      await this.syncEquipmentTypeRelations();
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
        equipmentTypeInfo: typesByName.get('elevator') ?? null,
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
        equipmentTypeInfo: typesByName.get('elevator') ?? null,
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
        equipmentTypeInfo: typesByName.get('escalator') ?? null,
        equipmentCode: 'ESC-010',
        serialNumber: 'SN-MDY-010',
        brand: 'Otis',
        model: 'Transit',
        location: 'North Wing Entrance',
        isActive: true,
        building: buildingB,
      },
    ]);

    await this.syncEquipmentTypeRelations();
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

  async getEquipmentTypes(): Promise<Array<{ equipmentType: string; id?: string; code?: string | null; category?: string | null; isActive?: boolean }>> {
    const managedTypes = await this.equipmentTypeRepository.find({
      order: { name: 'ASC' },
    });

    if (managedTypes.length > 0) {
      return managedTypes.map((type) => ({
        id: type.id,
        equipmentType: type.name,
        code: type.code,
        category: type.category,
        isActive: type.isActive,
      }));
    }

    return this.equipmentRepository
      .createQueryBuilder('equipment')
      .select('equipment.equipmentType', 'equipmentType')
      .distinct(true)
      .orderBy('equipment.equipmentType', 'ASC')
      .getRawMany();
  }

  async getAdminEquipmentTypes(): Promise<EquipmentType[]> {
    return this.equipmentTypeRepository.find({
      order: { name: 'ASC' },
    });
  }

  async createEquipmentType(payload: CreateEquipmentTypeDto): Promise<EquipmentType> {
    const equipmentType = this.equipmentTypeRepository.create({
      name: payload.name.trim(),
      code: this.normalizeOptionalText(payload.code),
      description: this.normalizeOptionalText(payload.description),
      category: this.normalizeOptionalText(payload.category),
      isActive: payload.isActive ?? true,
    });

    return this.equipmentTypeRepository.save(equipmentType);
  }

  async updateEquipmentType(
    id: string,
    payload: UpdateEquipmentTypeDto,
  ): Promise<EquipmentType> {
    const equipmentType = await this.equipmentTypeRepository.findOne({
      where: { id },
    });

    if (!equipmentType) {
      throw new NotFoundException('Equipment type not found');
    }

    if (payload.name !== undefined) {
      equipmentType.name = payload.name.trim();
    }
    if (payload.code !== undefined) {
      equipmentType.code = this.normalizeOptionalText(payload.code);
    }
    if (payload.description !== undefined) {
      equipmentType.description = this.normalizeOptionalText(payload.description);
    }
    if (payload.category !== undefined) {
      equipmentType.category = this.normalizeOptionalText(payload.category);
    }
    if (payload.isActive !== undefined) {
      equipmentType.isActive = payload.isActive;
    }

    const savedType = await this.equipmentTypeRepository.save(equipmentType);

    await this.equipmentRepository
      .createQueryBuilder()
      .update(Equipment)
      .set({ equipmentType: savedType.name })
      .where('"equipmentTypeId" = :equipmentTypeId', { equipmentTypeId: savedType.id })
      .execute();

    return savedType;
  }

  async getEquipmentByBuilding(
    buildingId: string,
    equipmentType?: string,
  ): Promise<Equipment[]> {
    const query = this.equipmentRepository
      .createQueryBuilder('equipment')
      .leftJoinAndSelect('equipment.building', 'building')
      .leftJoinAndSelect('equipment.equipmentTypeInfo', 'equipmentTypeInfo')
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
      .leftJoinAndSelect('equipment.equipmentTypeInfo', 'equipmentTypeInfo')
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

    const equipmentType = await this.findEquipmentTypeOrThrow(
      payload.equipmentTypeId,
      payload.equipmentType,
    );

    const equipment = this.equipmentRepository.create({
      building,
      equipmentType: equipmentType.name,
      equipmentTypeInfo: equipmentType,
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
      relations: ['building', 'equipmentTypeInfo'],
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

    if (payload.equipmentType !== undefined || payload.equipmentTypeId !== undefined) {
      const equipmentType = await this.findEquipmentTypeOrThrow(
        payload.equipmentTypeId,
        payload.equipmentType ?? equipment.equipmentType,
      );
      equipment.equipmentType = equipmentType.name;
      equipment.equipmentTypeInfo = equipmentType;
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
