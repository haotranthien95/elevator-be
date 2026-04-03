import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const REPORT_STATUSES = [
  'pending',
  'scheduled',
  'active',
  'submitted',
  'pc-review',
  'comm-review',
  'invoice-ready',
] as const;

export const REPORT_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export const REPORT_NOTE_KINDS = ['system', 'dispatch', 'review', 'finance'] as const;

export class ListMaintenanceReportsQueryDto {
  @IsOptional()
  @IsString()
  reportCode?: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsString()
  equipmentType?: string;

  @IsOptional()
  @IsString()
  technician?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsIn(REPORT_STATUSES)
  status?: (typeof REPORT_STATUSES)[number];

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UpdateReportStatusDto {
  @IsIn(REPORT_STATUSES)
  status!: (typeof REPORT_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  author?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AssignMaintenanceReportDto {
  @IsOptional()
  @IsUUID()
  assignedTechnicianId?: string;

  @IsString()
  @MaxLength(120)
  assignedTo!: string;

  @IsOptional()
  @IsIn(REPORT_PRIORITIES)
  priority?: (typeof REPORT_PRIORITIES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  author?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CreateMaintenanceReportNoteDto {
  @IsString()
  @MaxLength(120)
  author!: string;

  @IsOptional()
  @IsIn(REPORT_NOTE_KINDS)
  kind?: (typeof REPORT_NOTE_KINDS)[number];

  @IsString()
  @MaxLength(1000)
  text!: string;
}
