import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PartsUsedDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateMaintenanceReportDto {
  @IsUUID()
  buildingId: string;

  @IsUUID()
  equipmentId: string;

  @IsString()
  @IsNotEmpty()
  maintenanceType: string;

  @IsDateString()
  arrivalDateTime: string;

  @IsString()
  @IsNotEmpty()
  technicianName: string;

  @IsOptional()
  @IsString()
  findings?: string;

  @IsOptional()
  @IsString()
  workPerformed?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartsUsedDto)
  partsUsed?: PartsUsedDto[];

  @IsOptional()
  @IsString()
  remarks?: string;
}
