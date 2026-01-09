import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProgressDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  increment?: number;
}

