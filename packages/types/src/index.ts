export type ActivityStatus = 'pending' | 'validated' | 'rejected';

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface EventSummary {
  id: string;
  title: string;
  revealAt: string;
  startsAt: string;
  startAreaRadiusKm: number;
}
