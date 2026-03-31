import { getFunctionsBaseUrl, nhostConfig } from './nhostClient';

interface TrackpointPayload {
  eventId: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  recordedAt: string;
}

const configuredTrackpointsEndpoint = process.env.EXPO_PUBLIC_TRACKPOINTS_ENDPOINT?.trim().replace(/\/+$/, '');

function getTrackpointsEndpoint(): string | null {
  if (configuredTrackpointsEndpoint) {
    return configuredTrackpointsEndpoint;
  }

  if (!nhostConfig.isFunctionsEnabled) {
    return null;
  }

  return `${getFunctionsBaseUrl()}/trackpoints`;
}

export async function sendTrackpoint(payload: TrackpointPayload): Promise<void> {
  const endpoint = getTrackpointsEndpoint();
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
