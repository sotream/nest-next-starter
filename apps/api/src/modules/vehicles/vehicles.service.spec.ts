import { randomUUID } from 'node:crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { Role } from '../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import type { EventPublisher } from '../../infrastructure/messaging/event-publisher.port.js';
import { FuelType, Vehicle } from './entities/vehicle.entity.js';
import { VehiclesService } from './vehicles.service.js';

/** In-memory repository covering only the calls VehiclesService makes. */
function createFakeRepository(): Repository<Vehicle> {
  const rows: Vehicle[] = [];
  const matches = (row: Vehicle, where: FindOptionsWhere<Vehicle> = {}): boolean =>
    Object.entries(where).every(([key, value]) => row[key as keyof Vehicle] === value);

  const fake = {
    create: (data: Partial<Vehicle>) => Object.assign(new Vehicle(), data),
    save: (vehicle: Vehicle) => {
      const duplicate = rows.find(
        (row) => row !== vehicle && row.plateNumber === vehicle.plateNumber,
      );
      if (duplicate) {
        const driverError = Object.assign(new Error('duplicate key'), { code: '23505' });
        return Promise.reject(new QueryFailedError('INSERT', [], driverError));
      }
      if (!rows.includes(vehicle)) {
        vehicle.id = randomUUID();
        rows.push(vehicle);
      }
      return Promise.resolve(vehicle);
    },
    findOneBy: (where: FindOptionsWhere<Vehicle>) =>
      Promise.resolve(rows.find((row) => matches(row, where)) ?? null),
    findAndCount: ({ where, take = rows.length, skip = 0 }: FindManyOptions<Vehicle>) => {
      const hit = rows.filter((row) => matches(row, where as FindOptionsWhere<Vehicle>));
      return Promise.resolve([hit.slice(skip, skip + take), hit.length]);
    },
    remove: (vehicle: Vehicle) => {
      rows.splice(rows.indexOf(vehicle), 1);
      return Promise.resolve(vehicle);
    },
  };
  return fake as unknown as Repository<Vehicle>;
}

const alice: AuthenticatedUser = { id: 'alice', role: Role.USER };
const bob: AuthenticatedUser = { id: 'bob', role: Role.USER };
const admin: AuthenticatedUser = { id: 'admin', role: Role.ADMIN };

const dto = (plateNumber: string) => ({ plateNumber, model: 'Golf', fuelType: FuelType.PETROL });
const page = { limit: 20, offset: 0 };

describe('VehiclesService', () => {
  let service: VehiclesService;
  let publish: ReturnType<typeof vi.fn<EventPublisher['publish']>>;

  beforeEach(() => {
    publish = vi.fn<EventPublisher['publish']>().mockResolvedValue(undefined);
    service = new VehiclesService(createFakeRepository(), { publish });
  });

  it('assigns the current user as owner', async () => {
    const vehicle = await service.create(alice, dto('A-1'));

    expect(vehicle.ownerId).toBe('alice');
  });

  it('publishes vehicle.created after saving', async () => {
    const vehicle = await service.create(alice, dto('A-1'));

    expect(publish).toHaveBeenCalledWith('vehicle.created', {
      key: vehicle.id,
      payload: expect.objectContaining({ id: vehicle.id, ownerId: 'alice', plateNumber: 'A-1' }),
    });
  });

  it('still creates the vehicle when publishing fails', async () => {
    publish.mockRejectedValue(new Error('broker down'));

    await expect(service.create(alice, dto('A-1'))).resolves.toHaveProperty('id');
  });

  it('does not publish when the vehicle is rejected as a duplicate', async () => {
    await service.create(alice, dto('A-1'));
    publish.mockClear();

    await expect(service.create(bob, dto('A-1'))).rejects.toBeInstanceOf(ConflictException);
    expect(publish).not.toHaveBeenCalled();
  });

  it('rejects a duplicate plate number with 409', async () => {
    await service.create(alice, dto('A-1'));

    await expect(service.create(bob, dto('A-1'))).rejects.toBeInstanceOf(ConflictException);
  });

  describe('listing', () => {
    beforeEach(async () => {
      await service.create(alice, dto('A-1'));
      await service.create(alice, dto('A-2'));
      await service.create(bob, dto('B-1'));
    });

    it('shows users only their own vehicles', async () => {
      const result = await service.findAll(alice, page);

      expect(result.total).toBe(2);
      expect(result.items.every((vehicle) => vehicle.ownerId === 'alice')).toBe(true);
    });

    it('shows admins every vehicle', async () => {
      expect((await service.findAll(admin, page)).total).toBe(3);
    });

    it('applies limit and offset but reports the full total', async () => {
      const result = await service.findAll(admin, { limit: 1, offset: 1 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(3);
    });
  });

  describe('access control', () => {
    it("reports another user's vehicle as not found for read, update and delete", async () => {
      const { id } = await service.create(alice, dto('A-1'));

      await expect(service.findOne(bob, id)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.update(bob, id, { model: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.remove(bob, id)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lets admins manage any vehicle', async () => {
      const { id } = await service.create(alice, dto('A-1'));

      const updated = await service.update(admin, id, { model: 'Polo' });
      await service.remove(admin, id);

      expect(updated.model).toBe('Polo');
      await expect(service.findOne(alice, id)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects changing a plate to one that is already taken', async () => {
      await service.create(alice, dto('A-1'));
      const { id } = await service.create(alice, dto('A-2'));

      await expect(service.update(alice, id, { plateNumber: 'A-1' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});
