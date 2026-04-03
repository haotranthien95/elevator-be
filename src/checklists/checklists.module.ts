import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ChecklistTemplate } from '../common/entities/checklist-template.entity';
import { EquipmentType } from '../common/entities/equipment-type.entity';
import { ChecklistsController } from './checklists.controller';
import { ChecklistsService } from './checklists.service';

@Module({
  imports: [AuditModule, AuthModule, TypeOrmModule.forFeature([ChecklistTemplate, EquipmentType])],
  controllers: [ChecklistsController],
  providers: [ChecklistsService],
})
export class ChecklistsModule {}
