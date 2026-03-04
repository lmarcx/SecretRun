import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { GraphQLClient, gql } from 'graphql-request';
import { computeDestinationPoint, haversineDistanceKm } from './utils/computeDestinationPoint';
import { randomPointInRadius, type LatLng } from './utils/randomPointInRadius';

interface Input {
  event_id: string;
  distance_km: number;
  start_area_center: LatLng;
}

interface OrsGeometry {
  type: string;
  coordinates: unknown;
}

interface RoutePayload {
  geometry: OrsGeometry;
  distance_m: number;
  duration_sec: number;
}

interface EventInfo {
  start_area_radius_km: number;
}

const getEventQuery = gql`
  query GetEventForRoute($eventId: uuid!) {
    events_by_pk(id: $eventId) {
      start_area_radius_km
    }
  }
`;

const upsertRouteMutation = gql`
  mutation UpsertRoute(
    $eventId: uuid!
    $routeEncrypted: String!
    $distanceM: numeric!
    $durationSec: Int!
  ) {
    insert_event_routes_one(
      object: {
        event_id: $eventId
        route_encrypted: $routeEncrypted
        distance_m: $distanceM
        duration_sec: $durationSec
        revealed: false
        revealed_at: null
      }
      on_conflict: {
        constraint: event_routes_event_id_key
        update_columns: [route_encrypted, distance_m, duration_sec, revealed, revealed_at]
      }
    ) {
      id
      event_id
    }
  }
`;

function parseOrsResponse(data: unknown): RoutePayload {
  const maybeGeoJson = data as {
    features?: Array<{
      geometry?: OrsGeometry;
      properties?: { segments?: Array<{ distance?: number; duration?: number }> };
    }>;
    routes?: Array<{
      geometry?: OrsGeometry;
      segments?: Array<{ distance?: number; duration?: number }>;
    }>;
  };

  const featureRoute = maybeGeoJson.features?.[0];
  const apiRoute = maybeGeoJson.routes?.[0];

  const geometry = featureRoute?.geometry ?? apiRoute?.geometry;
  const segment = featureRoute?.properties?.segments?.[0] ?? apiRoute?.segments?.[0];

  if (!geometry || !segment?.distance || !segment?.duration) {
    throw new Error('Invalid response from OpenRouteService');
  }

  return {
    geometry,
    distance_m: segment.distance,
    duration_sec: Math.round(segment.duration),
  };
}

function getEncryptionKey(): Buffer {
  const secret = process.env.ROUTE_ENCRYPTION_SECRET ?? process.env.NHOST_ADMIN_SECRET;
  if (!secret) {
    throw new Error('ROUTE_ENCRYPTION_SECRET or NHOST_ADMIN_SECRET is required for encryption');
  }

  return createHash('sha256').update(secret).digest();
}

function encryptRoutePayload(payload: RoutePayload): string {
  const iv = randomBytes(12);
  const key = getEncryptionKey();
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('base64'),
    content: encrypted.toString('base64'),
    tag: tag.toString('base64'),
  });
}

export function decryptRoutePayload(encryptedText: string): RoutePayload {
  const parsed = JSON.parse(encryptedText) as { iv: string; content: string; tag: string };
  const iv = Buffer.from(parsed.iv, 'base64');
  const content = Buffer.from(parsed.content, 'base64');
  const tag = Buffer.from(parsed.tag, 'base64');

  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(content), decipher.final()]).toString('utf8');
  return JSON.parse(decrypted) as RoutePayload;
}

async function requestRoute(orsApiKey: string, start: LatLng, end: LatLng): Promise<RoutePayload> {
  const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
    method: 'POST',
    headers: {
      Authorization: orsApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates: [
        [start.lng, start.lat],
        [end.lng, end.lat],
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouteService error: ${response.status} ${body}`);
  }

  const json = (await response.json()) as unknown;
  return parseOrsResponse(json);
}

function isDistanceAcceptable(requestedKm: number, actualMeters: number): boolean {
  const requestedMeters = requestedKm * 1000;
  const diff = Math.abs(actualMeters - requestedMeters);
  return diff / requestedMeters <= 0.15;
}

export default async function handler(req: { body?: Input }) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;
  const orsApiKey = process.env.ORS_API_KEY;

  if (!url || !adminSecret || !orsApiKey) {
    throw new Error('NHOST_GRAPHQL_URL, NHOST_ADMIN_SECRET and ORS_API_KEY are required');
  }

  const payload = req.body;
  if (!payload?.event_id || !payload.distance_km || !payload.start_area_center) {
    return {
      success: false,
      error: 'event_id, distance_km and start_area_center are required',
    };
  }

  const client = new GraphQLClient(url, {
    headers: {
      'x-hasura-admin-secret': adminSecret,
    },
  });

  const eventResponse = await client.request<{ events_by_pk: EventInfo | null }>(getEventQuery, {
    eventId: payload.event_id,
  });

  if (!eventResponse.events_by_pk) {
    return {
      success: false,
      error: 'Event not found',
    };
  }

  const radiusKm = Number(eventResponse.events_by_pk.start_area_radius_km);

  let selectedRoute: RoutePayload | null = null;
  let selectedStart: LatLng | null = null;
  let selectedEnd: LatLng | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const startPoint = randomPointInRadius(payload.start_area_center, radiusKm);

    const randomBearing = Math.random() * 360;
    const straightLineDistanceKm = payload.distance_km * 0.7;
    const endPoint = computeDestinationPoint(startPoint, straightLineDistanceKm, randomBearing);

    const route = await requestRoute(orsApiKey, startPoint, endPoint);

    if (isDistanceAcceptable(payload.distance_km, route.distance_m)) {
      selectedRoute = route;
      selectedStart = startPoint;
      selectedEnd = endPoint;
      break;
    }

    if (attempt === 3) {
      selectedRoute = route;
      selectedStart = startPoint;
      selectedEnd = endPoint;
    }
  }

  if (!selectedRoute || !selectedStart || !selectedEnd) {
    return {
      success: false,
      error: 'Unable to generate route',
    };
  }

  const encrypted = encryptRoutePayload(selectedRoute);

  await client.request(upsertRouteMutation, {
    eventId: payload.event_id,
    routeEncrypted: encrypted,
    distanceM: selectedRoute.distance_m,
    durationSec: selectedRoute.duration_sec,
  });

  return {
    success: true,
    event_id: payload.event_id,
    requested_distance_km: payload.distance_km,
    generated_distance_km: Number((selectedRoute.distance_m / 1000).toFixed(2)),
    estimated_duration_sec: selectedRoute.duration_sec,
    straight_line_km: Number(haversineDistanceKm(selectedStart, selectedEnd).toFixed(2)),
  };
}
