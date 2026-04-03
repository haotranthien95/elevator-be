import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const SCHEDULE_STATUSES = ['scheduled', 'completed', 'overdue', 'cancelled'] as const;
export const SCHEDULE_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export const SCHEDULE_RECURRENCE_RULES = ['One-time', 'Weekly', 'Monthly', 'Quarterly'] as const;

export class ListSchedulesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @IsOptional()
  @IsUUID()
  equipmentId?: string;

  @IsOptional()
  @IsUUID()
  technicianId?: string;

  @IsOptional()
  @IsIn(SCHEDULE_STATUSES)
  status?: (typeof SCHEDULE_STATUSES)[number];

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activeOnly?: boolean;
}

export class CreateScheduleDto {
  @IsUUID()
  buildingId!: string;

  @IsOptional()
  @IsUUID()
  equipmentId?: string;

  @IsOptional()
  @IsUUID()
  assignedTechnicianId?: string;

  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(120)
  maintenanceType!: string;

  @IsDateString()
  scheduledDate!: string;

  @IsOptional()
  @IsIn(SCHEDULE_STATUSES)
  status?: (typeof SCHEDULE_STATUSES)[number];

  @IsOptional()
  @IsIn(SCHEDULE_PRIORITIES)
  priority?: (typeof SCHEDULE_PRIORITIES)[number];

  @IsOptional()
  @IsIn(SCHEDULE_RECURRENCE_RULES)
  recurrenceRule?: (typeof SCHEDULE_RECURRENCE_RULES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(20)
  linkedReportCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @IsOptional()
  @IsUUID()
  equipmentId?: string;

  @IsOptional()
  @IsUUID()
  assignedTechnicianId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  maintenanceType?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsIn(SCHEDULE_STATUSES)
  status?: (typeof SCHEDULE_STATUSES)[number];

  @IsOptional()
  @IsIn(SCHEDULE_PRIORITIES)
  priority?: (typeof SCHEDULE_PRIORITIES)[number];

  @IsOptional()
  @IsIn(SCHEDULE_RECURRENCE_RULES)
  recurrenceRule?: (typeof SCHEDULE_RECURRENCE_RULES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(20)
  linkedReportCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
