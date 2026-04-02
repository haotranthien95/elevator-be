import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateBuildingDto,
  CreateEquipmentAdminDto,
  ListAdminEquipmentQueryDto,
  UpdateBuildingDto,
  UpdateEquipmentAdminDto,
} from './dto/admin-master-data.dto';
import { EquipmentService } from './equipment.service';

@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

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

  @UseGuards(JwtAuthGuard)
  @Get('admin/buildings')
  async getAdminBuildings() {
    const data = await this.equipmentService.getAdminBuildings();
    return { success: true, total: data.length, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/buildings')
  async createBuilding(@Body() payload: CreateBuildingDto) {
    const data = await this.equipmentService.createBuilding(payload);
    return { success: true, message: 'Building created successfully', data };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/buildings/:id')
  async updateBuilding(
    @Param('id') id: string,
    @Body() payload: UpdateBuildingDto,
  ) {
    const data = await this.equipmentService.updateBuilding(id, payload);
    return { success: true, message: 'Building updated successfully', data };
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/items')
  async getAdminEquipment(@Query() query: ListAdminEquipmentQueryDto) {
    const data = await this.equipmentService.getAdminEquipmentList(query);
    return { success: true, total: data.length, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/items')
  async createEquipment(@Body() payload: CreateEquipmentAdminDto) {
    const data = await this.equipmentService.createEquipment(payload);
    return { success: true, message: 'Equipment created successfully', data };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/items/:id')
  async updateEquipment(
    @Param('id') id: string,
    @Body() payload: UpdateEquipmentAdminDto,
  ) {
    const data = await this.equipmentService.updateEquipment(id, payload);
    return { success: true, message: 'Equipment updated successfully', data };
  }
}
