import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { FuelType } from '../entities/vehicle.entity.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateVehicleDto {
  @ApiProperty({ example: 'B-AB 1234', description: 'Unique across all vehicles' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  plateNumber: string;

  @ApiProperty({ example: 'VW Golf' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model: string;

  @ApiProperty({ enum: FuelType })
  @IsEnum(FuelType)
  fuelType: FuelType;
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}

export class VehicleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() plateNumber: string;
  @ApiProperty() model: string;
  @ApiProperty({ enum: FuelType }) fuelType: FuelType;
  @ApiProperty() ownerId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class VehiclePageDto {
  @ApiProperty({ type: [VehicleResponseDto] }) items: VehicleResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() limit: number;
  @ApiProperty() offset: number;
}
