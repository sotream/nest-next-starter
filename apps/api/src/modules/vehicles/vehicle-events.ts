export const VEHICLE_CREATED_TOPIC = 'vehicle.created';

export interface VehicleCreatedEvent {
  id: string;
  plateNumber: string;
  ownerId: string;
  occurredAt: string;
}
