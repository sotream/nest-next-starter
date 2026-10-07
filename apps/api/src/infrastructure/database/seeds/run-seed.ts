import { hash } from 'bcryptjs';
import type { DataSource } from 'typeorm';
import { Role } from '../../../common/enums/role.enum.js';
import { User } from '../../../modules/users/entities/user.entity.js';
import { FuelType, Vehicle } from '../../../modules/vehicles/entities/vehicle.entity.js';
import { validateEnv } from '../../config/env.validation.js';
import dataSource from '../data-source.js';
import { assertSeedAllowed } from './seed-guard.js';

// Local development credentials only. Never reuse them anywhere reachable from the internet.
const SEED_USERS = [
  { email: 'admin@example.com', password: 'Admin123!local', role: Role.ADMIN },
  { email: 'user@example.com', password: 'User123!local', role: Role.USER },
] as const;

const SEED_VEHICLES = [
  {
    plateNumber: 'B-AB 1234',
    model: 'VW Golf',
    fuelType: FuelType.PETROL,
    ownerEmail: 'user@example.com',
  },
  {
    plateNumber: 'B-CD 5678',
    model: 'Tesla Model 3',
    fuelType: FuelType.ELECTRIC,
    ownerEmail: 'user@example.com',
  },
  {
    plateNumber: 'M-EF 9012',
    model: 'Toyota Yaris Hybrid',
    fuelType: FuelType.HYBRID,
    ownerEmail: 'admin@example.com',
  },
] as const;

async function seedUsers(db: DataSource): Promise<Map<string, User>> {
  const repo = db.getRepository(User);
  const byEmail = new Map<string, User>();
  for (const { email, password, role } of SEED_USERS) {
    const existing = await repo.findOneBy({ email });
    byEmail.set(
      email,
      existing ??
        (await repo.save(repo.create({ email, role, passwordHash: await hash(password, 10) }))),
    );
  }
  return byEmail;
}

async function seedVehicles(db: DataSource, owners: Map<string, User>): Promise<void> {
  const repo = db.getRepository(Vehicle);
  for (const { ownerEmail, ...vehicle } of SEED_VEHICLES) {
    const owner = owners.get(ownerEmail);
    if (owner && !(await repo.existsBy({ plateNumber: vehicle.plateNumber }))) {
      await repo.save(repo.create({ ...vehicle, ownerId: owner.id }));
    }
  }
}

async function main(): Promise<void> {
  assertSeedAllowed(validateEnv(process.env).APP_ENV);
  await dataSource.initialize();
  try {
    await seedVehicles(dataSource, await seedUsers(dataSource));
    console.log('Seed complete.');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
