import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { Building } from '../common/entities/building.entity';
import { EquipmentType } from '../common/entities/equipment-type.entity';
import { Equipment } from '../common/entities/equipment.entity';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';

@Module({
  imports: [AuditModule, AuthModule, TypeOrmModule.forFeature([Building, EquipmentType, Equipment])],
  controllers: [EquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
