import type { Metadata } from 'next';
import { VehiclesView } from '@/components/vehicles-view';

export const metadata: Metadata = { title: 'Vehicles' };

export default function VehiclesPage() {
  return <VehiclesView />;
}
