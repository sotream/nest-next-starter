/** Mirrors the API's response shapes. Hand-written on purpose: the surface is small. */
export type Role = 'USER' | 'ADMIN';
export type FuelType = 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID';

export const FUEL_TYPES: readonly FuelType[] = ['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID'];

export interface User {
  id: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  fuelType: FuelType;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleInput {
  plateNumber: string;
  model: string;
  fuelType: FuelType;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
