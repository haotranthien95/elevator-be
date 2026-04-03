import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ChecklistCategoryDto {
  @IsString()
  @MaxLength(80)
  category!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  items!: string[];
}

export class ListChecklistTemplatesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsUUID()
  equipmentTypeId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activeOnly?: boolean;
}

export class CreateChecklistTemplateDto {
  @IsUUID()
  equipmentTypeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChecklistCategoryDto)
  categories!: ChecklistCategoryDto[];

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateChecklistTemplateDto {
  @IsOptional()
  @IsUUID()
  equipmentTypeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChecklistCategoryDto)
  categories?: ChecklistCategoryDto[];

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
