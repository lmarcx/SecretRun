interface TrackpointPayload {
  eventId: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  recordedAt: string;
}

const endpoint = process.env.EXPO_PUBLIC_TRACKPOINTS_ENDPOINT;

export async function sendTrackpoint(payload: TrackpointPayload): Promise<void> {
  if (!endpoint) {
    return;
  }

  await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}
