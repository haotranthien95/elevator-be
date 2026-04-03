import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ChecklistTemplate } from '../common/entities/checklist-template.entity';
import { ChecklistsService } from './checklists.service';
import {
  CreateChecklistTemplateDto,
  ListChecklistTemplatesQueryDto,
  UpdateChecklistTemplateDto,
} from './dto/admin-checklist.dto';

@Controller('checklists')
export class ChecklistsController {
  constructor(
    private readonly checklistsService: ChecklistsService,
    private readonly auditService: AuditService,
  ) {}

  private serializeTemplate(template: ChecklistTemplate | null) {
    if (!template) {
      return null;
    }

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      categories: template.categories ?? [],
      isActive: template.isActive,
      equipmentType: template.equipmentType
        ? {
            id: template.equipmentType.id,
            name: template.equipmentType.name,
            code: template.equipmentType.code,
            category: template.equipmentType.category,
          }
        : null,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  @Get('template')
  async getPublicTemplate(@Query('equipmentType') equipmentType?: string) {
    const data = await this.checklistsService.findPublicTemplate(equipmentType);
    return { success: true, data: this.serializeTemplate(data) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin')
  async getAdminTemplates(@Query() query: ListChecklistTemplatesQueryDto) {
    const data = await this.checklistsService.findAll(query);
    return {
      success: true,
      total: data.length,
      data: data.map((template) => this.serializeTemplate(template)),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/:id')
  async getAdminTemplate(@Param('id') id: string) {
    const data = await this.checklistsService.findOne(id);
    return { success: true, data: this.serializeTemplate(data) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin')
  async createTemplate(
    @Body() payload: CreateChecklistTemplateDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const data = await this.checklistsService.create(payload);

    await this.auditService.recordFromActor(request.user, {
      action: 'checklist-template.created',
      resourceType: 'checklist-template',
      resourceId: data.id,
      resourceLabel: data.name,
      details: {
        equipmentType: data.equipmentType?.name ?? null,
        isActive: data.isActive,
        categoryCount: data.categories?.length ?? 0,
      },
    });

    return {
      success: true,
      message: 'Checklist template created successfully',
      data: this.serializeTemplate(data),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('admin/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() payload: UpdateChecklistTemplateDto,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const data = await this.checklistsService.update(id, payload);

    await this.auditService.recordFromActor(request.user, {
      action: 'checklist-template.updated',
      resourceType: 'checklist-template',
      resourceId: data.id,
      resourceLabel: data.name,
      details: {
        equipmentType: data.equipmentType?.name ?? null,
        isActive: data.isActive,
        categoryCount: data.categories?.length ?? 0,
      },
    });

    return {
      success: true,
      message: 'Checklist template updated successfully',
      data: this.serializeTemplate(data),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('admin/:id')
  async deleteTemplate(
    @Param('id') id: string,
    @Req() request: { user?: { sub?: string; email?: string; name?: string; role?: string } },
  ) {
    const template = await this.checklistsService.findOne(id);
    await this.checklistsService.remove(id);

    await this.auditService.recordFromActor(request.user, {
      action: 'checklist-template.deleted',
      resourceType: 'checklist-template',
      resourceId: template.id,
      resourceLabel: template.name,
      details: {
        equipmentType: template.equipmentType?.name ?? null,
        categoryCount: template.categories?.length ?? 0,
      },
    });

    return { success: true, message: 'Checklist template deleted successfully' };
  }
}
