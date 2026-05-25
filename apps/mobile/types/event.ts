export type EventStatus = 'hidden' | 'full' | 'open';

export interface RunEvent {
  id: string;
  title: string;
  status: EventStatus;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  revealDate?: string | undefined;
  startDate: string;
  registeredCount: number;
  maxParticipants: number;
  routeKm?: number | undefined;
}
