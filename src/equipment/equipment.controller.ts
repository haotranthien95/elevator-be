import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateBuildingDto,
  CreateEquipmentAdminDto,
  CreateEquipmentTypeDto,
  ListAdminEquipmentQueryDto,
  UpdateBuildingDto,
  UpdateEquipmentAdminDto,
  UpdateEquipmentTypeDto,
} from './dto/admin-master-data.dto';
import { EquipmentService } from './equipment.service';

@Controller('equipment')
export class EquipmentController {
  constructor(
    private readonly equipmentService: EquipmentService,
    private readonly auditService: AuditService,
  ) {}

  @Get('buildings')
  async getBuildings() {
    const data = await this.equipmentService.getBuildings();
    return { success: true, data };
  }

  @Get('types')
  async getTypes() {
    const data = await this.equipmentService.getEquipmentTypes();
    return { success: true, data };
  }

  @Get('by-building')
  async getByBuilding(
    @Query('buildingId') buildingId: string,
    @Query('equipmentType') equipmentType?: string,
  ) {
    const data = await this.equipmentService.getEquipmentByBuilding(
      buildingId,
      equipmentType,
    );
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/buildings')
  async getAdminBuildings() {
    const data = await this.equipmentService.getAdminBuildings();
    return { success: true, total: data.length, data };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/buildings')
  async createBuilding(
    @Body() payload: CreateBuildingDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const data = await this.equipmentService.createBuilding(payload);
    await this.auditService.recordFromActor(request.user, {
      action: 'building.created',
      resourceType: 'building',
      resourceId: data.id,
      resourceLabel: data.name,
      details: {
        code: data.code,
        isActive: data.isActive,
      },
    });
    return { success: true, message: 'Building created successfully', data };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('admin/buildings/:id')
  async updateBuilding(
    @Param('id') id: string,
    @Body() payload: UpdateBuildingDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const data = await this.equipmentService.updateBuilding(id, payload);
    await this.auditService.recordFromActor(request.user, {
      action: 'building.updated',
      resourceType: 'building',
      resourceId: data.id,
      resourceLabel: data.name,
      details: {
        code: data.code,
        isActive: data.isActive,
      },
    });
    return { success: true, message: 'Building updated successfully', data };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/types')
  async getAdminEquipmentTypes() {
    const data = await this.equipmentService.getAdminEquipmentTypes();
    return { success: true, total: data.length, data };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/types')
  async createEquipmentType(
    @Body() payload: CreateEquipmentTypeDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const data = await this.equipmentService.createEquipmentType(payload);
    await this.auditService.recordFromActor(request.user, {
      action: 'equipment-type.created',
      resourceType: 'equipment-type',
      resourceId: data.id,
      resourceLabel: data.name,
      details: {
        code: data.code,
        category: data.category,
        isActive: data.isActive,
      },
    });
    return { success: true, message: 'Equipment type created successfully', data };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('admin/types/:id')
  async updateEquipmentType(
    @Param('id') id: string,
    @Body() payload: UpdateEquipmentTypeDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const data = await this.equipmentService.updateEquipmentType(id, payload);
    await this.auditService.recordFromActor(request.user, {
      action: 'equipment-type.updated',
      resourceType: 'equipment-type',
      resourceId: data.id,
      resourceLabel: data.name,
      details: {
        code: data.code,
        category: data.category,
        isActive: data.isActive,
      },
    });
    return { success: true, message: 'Equipment type updated successfully', data };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/items')
  async getAdminEquipment(@Query() query: ListAdminEquipmentQueryDto) {
    const data = await this.equipmentService.getAdminEquipmentList(query);
    return { success: true, total: data.length, data };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/items')
  async createEquipment(
    @Body() payload: CreateEquipmentAdminDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const data = await this.equipmentService.createEquipment(payload);
    await this.auditService.recordFromActor(request.user, {
      action: 'equipment.created',
      resourceType: 'equipment',
      resourceId: data.id,
      resourceLabel: data.equipmentCode,
      details: {
        building: data.building?.name ?? null,
        equipmentType: data.equipmentType,
        isActive: data.isActive,
      },
    });
    return { success: true, message: 'Equipment created successfully', data };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('admin/items/:id')
  async updateEquipment(
    @Param('id') id: string,
    @Body() payload: UpdateEquipmentAdminDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const data = await this.equipmentService.updateEquipment(id, payload);
    await this.auditService.recordFromActor(request.user, {
      action: 'equipment.updated',
      resourceType: 'equipment',
      resourceId: data.id,
      resourceLabel: data.equipmentCode,
      details: {
        building: data.building?.name ?? null,
        equipmentType: data.equipmentType,
        isActive: data.isActive,
      },
    });
    return { success: true, message: 'Equipment updated successfully', data };
  }
}
