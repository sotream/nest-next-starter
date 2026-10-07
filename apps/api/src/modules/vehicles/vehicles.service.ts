import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { Role } from '../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import type { Page, PaginationQueryDto } from '../../common/pagination/pagination.dto.js';
import { isUniqueViolation } from '../../common/utils/db-errors.js';
import { EVENT_PUBLISHER } from '../../infrastructure/messaging/event-publisher.port.js';
import type { EventPublisher } from '../../infrastructure/messaging/event-publisher.port.js';
import type { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto.js';
import { Vehicle } from './entities/vehicle.entity.js';
import { VEHICLE_CREATED_TOPIC } from './vehicle-events.js';
import type { VehicleCreatedEvent } from './vehicle-events.js';

/** Users manage only their own vehicles; admins can see and manage all of them. */
@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.saveOrConflict(this.vehicles.create({ ...dto, ownerId: user.id }));
    await this.publishCreated(vehicle);
    return vehicle;
  }

  async findAll(
    user: AuthenticatedUser,
    { limit, offset }: PaginationQueryDto,
  ): Promise<Page<Vehicle>> {
    const [items, total] = await this.vehicles.findAndCount({
      where: this.scopeTo(user),
      order: { createdAt: 'DESC', id: 'ASC' },
      take: limit,
      skip: offset,
    });
    return { items, total, limit, offset };
  }

  findOne(user: AuthenticatedUser, id: string): Promise<Vehicle> {
    return this.findAccessible(user, id);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findAccessible(user, id);
    return this.saveOrConflict(Object.assign(vehicle, dto));
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    await this.vehicles.remove(await this.findAccessible(user, id));
  }

  private scopeTo(user: AuthenticatedUser): FindOptionsWhere<Vehicle> {
    return user.role === Role.ADMIN ? {} : { ownerId: user.id };
  }

  /** Someone else's vehicle is reported as missing so ids cannot be probed. */
  private async findAccessible(user: AuthenticatedUser, id: string): Promise<Vehicle> {
    const vehicle = await this.vehicles.findOneBy({ ...this.scopeTo(user), id });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    return vehicle;
  }

  private async saveOrConflict(vehicle: Vehicle): Promise<Vehicle> {
    try {
      return await this.vehicles.save(vehicle);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('A vehicle with this plate number already exists');
      }
      throw error;
    }
  }

  /** Best effort: the vehicle is already saved, so a broker outage must not fail the request. */
  private async publishCreated(vehicle: Vehicle): Promise<void> {
    const payload: VehicleCreatedEvent = {
      id: vehicle.id,
      plateNumber: vehicle.plateNumber,
      ownerId: vehicle.ownerId,
      occurredAt: new Date().toISOString(),
    };
    try {
      await this.events.publish(VEHICLE_CREATED_TOPIC, { key: vehicle.id, payload });
    } catch (error) {
      this.logger.warn(
        `Could not publish ${VEHICLE_CREATED_TOPIC} for ${vehicle.id}: ${String(error)}`,
      );
    }
  }
}
