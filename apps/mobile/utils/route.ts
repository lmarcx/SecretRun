import type { LatLng } from 'react-native-maps';

export interface EventRoute {
  polyline: LatLng[];
  startPoint: LatLng;
  endPoint: LatLng;
}

interface GeoJsonPoint {
  coordinates?: number[];
}

interface GeoJsonLineString {
  coordinates?: number[][];
}

function isCoordinatePair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number';
}

function parseJsonValue(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function parseGeoPoint(raw: unknown): LatLng | null {
  if (!raw) {
    return null;
  }

  if (typeof raw === 'string') {
    const match = raw.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i);
    if (match) {
      return {
        latitude: Number(match[2]),
        longitude: Number(match[1]),
      };
    }

    return parseGeoPoint(parseJsonValue(raw));
  }

  if (typeof raw === 'object' && raw !== null && 'coordinates' in raw) {
    const coordinates = (raw as GeoJsonPoint).coordinates;
    if (!coordinates || coordinates.length < 2) {
      return null;
    }

    return {
      latitude: Number(coordinates[1]),
      longitude: Number(coordinates[0]),
    };
  }

  return null;
}

function parsePolyline(raw: unknown): LatLng[] {
  if (!raw) {
    return [];
  }

  const parsed = typeof raw === 'string' ? parseJsonValue(raw) : raw;

  try {
    const coordinates = (parsed as GeoJsonLineString)?.coordinates ?? [];

    return coordinates
      .filter(isCoordinatePair)
      .map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
  } catch {
    return [];
  }
}

export function getStartAndEnd(points: LatLng[]): { startPoint: LatLng; endPoint: LatLng } {
  const startPoint = points[0] ?? { latitude: 0, longitude: 0 };
  const endPoint = points[points.length - 1] ?? startPoint;

  return {
    startPoint,
    endPoint,
  };
}

export function normalizeEventRoute(routePolyline: string | null): EventRoute | null {
  const polyline = parsePolyline(routePolyline);
  if (polyline.length < 2) {
    return null;
  }

  const { startPoint, endPoint } = getStartAndEnd(polyline);

  return {
    polyline,
    startPoint,
    endPoint,
  };
}

export function haversineDistanceMeters(from: LatLng, to: LatLng): number {
  const earthRadiusM = 6371000;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadiusM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculatePolylineDistanceMeters(points: LatLng[]): number {
  let total = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    if (!previous || !current) {
      continue;
    }

    total += haversineDistanceMeters(previous, current);
  }

  return total;
}

export function isWithinRadiusKm(point: LatLng, center: LatLng, radiusKm: number): boolean {
  return haversineDistanceMeters(point, center) <= radiusKm * 1000;
}
