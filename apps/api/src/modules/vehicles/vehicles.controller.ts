import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto.js';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  VehicleResponseDto,
  VehiclePageDto,
} from './dto/vehicle.dto.js';
import type { Vehicle } from './entities/vehicle.entity.js';
import { VehiclesService } from './vehicles.service.js';

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a vehicle owned by the current user' })
  @ApiCreatedResponse({ type: VehicleResponseDto })
  @ApiConflictResponse({ description: 'Plate number already exists' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateVehicleDto): Promise<Vehicle> {
    return this.vehicles.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List own vehicles (all vehicles for admins)' })
  @ApiOkResponse({ type: VehiclePageDto })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ): Promise<VehiclePageDto> {
    return this.vehicles.findAll(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: VehicleResponseDto })
  @ApiNotFoundResponse()
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Vehicle> {
    return this.vehicles.findOne(user, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: VehicleResponseDto })
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'Plate number already exists' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    return this.vehicles.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.vehicles.remove(user, id);
  }
}
