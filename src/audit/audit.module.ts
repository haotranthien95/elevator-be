import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AuditLog } from '../common/entities/audit-log.entity';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
