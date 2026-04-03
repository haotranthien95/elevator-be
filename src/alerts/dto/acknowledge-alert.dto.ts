import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const ALERT_TYPES = [
  'due-soon-schedule',
  'overdue-escalation',
  'dispatch-alert',
  'stale-review',
] as const;

export const ALERT_RESOURCE_TYPES = ['schedule', 'maintenance-report'] as const;

export class AcknowledgeAlertDto {
  @IsIn(ALERT_TYPES)
  alertType!: (typeof ALERT_TYPES)[number];

  @IsIn(ALERT_RESOURCE_TYPES)
  resourceType!: (typeof ALERT_RESOURCE_TYPES)[number];

  @IsString()
  resourceId!: string;

  @IsOptional()
  @IsString()
  resourceLabel?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  snoozeHours?: number;
}
