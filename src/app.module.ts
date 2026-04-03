import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsModule } from './alerts/alerts.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ChecklistsModule } from './checklists/checklists.module';
import { AlertAcknowledgement } from './common/entities/alert-acknowledgement.entity';
import { AuditLog } from './common/entities/audit-log.entity';
import { Building } from './common/entities/building.entity';
import { ChecklistTemplate } from './common/entities/checklist-template.entity';
import { EquipmentType } from './common/entities/equipment-type.entity';
import { Equipment } from './common/entities/equipment.entity';
import { MaintenanceReport } from './common/entities/maintenance-report.entity';
import { Schedule } from './common/entities/schedule.entity';
import { Technician } from './common/entities/technician.entity';
import { User } from './common/entities/user.entity';
import { EquipmentModule } from './equipment/equipment.module';
import { MaintenanceReportsModule } from './maintenance-reports/maintenance-reports.module';
import { SchedulesModule } from './schedules/schedules.module';
import { TechniciansModule } from './technicians/technicians.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get<string>('DB_PORT', '5432')),
        username: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>(
          'DB_NAME',
          'maintenance_service_report',
        ),
        schema: configService.get<string>('DB_SCHEMA', 'elevator'),
        entities: [
          AlertAcknowledgement,
          AuditLog,
          Building,
          ChecklistTemplate,
          EquipmentType,
          Equipment,
          MaintenanceReport,
          Schedule,
          Technician,
          User,
        ],
        synchronize: configService.get<string>('DB_SYNC', 'true') === 'true',
      }),
    }),
    AlertsModule,
    AnalyticsModule,
    AuditModule,
    AuthModule,
    ChecklistsModule,
    EquipmentModule,
    MaintenanceReportsModule,
    SchedulesModule,
    TechniciansModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
