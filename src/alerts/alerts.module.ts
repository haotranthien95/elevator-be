import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { AlertAcknowledgement } from '../common/entities/alert-acknowledgement.entity';
import { MaintenanceReport } from '../common/entities/maintenance-report.entity';
import { Schedule } from '../common/entities/schedule.entity';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    TypeOrmModule.forFeature([AlertAcknowledgement, MaintenanceReport, Schedule]),
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
