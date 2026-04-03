import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { Building } from '../common/entities/building.entity';
import { Equipment } from '../common/entities/equipment.entity';
import { MaintenanceReport } from '../common/entities/maintenance-report.entity';
import { Schedule } from '../common/entities/schedule.entity';
import { Technician } from '../common/entities/technician.entity';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    TypeOrmModule.forFeature([Schedule, Building, Equipment, MaintenanceReport, Technician]),
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
