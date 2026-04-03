import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { Technician } from '../common/entities/technician.entity';
import { TechniciansController } from './technicians.controller';
import { TechniciansService } from './technicians.service';

@Module({
  imports: [AuditModule, AuthModule, TypeOrmModule.forFeature([Technician])],
  controllers: [TechniciansController],
  providers: [TechniciansService],
  exports: [TechniciansService],
})
export class TechniciansModule {}
