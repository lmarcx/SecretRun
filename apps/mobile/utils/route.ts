import type { LatLng } from 'react-native-maps';

export interface EventRoute {
  polyline: LatLng[];
  startPoint: LatLng;
  endPoint: LatLng;
}

function parsePolyline(raw: string | null): LatLng[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as { coordinates?: number[][] };
    const coordinates = parsed.coordinates ?? [];

    return coordinates
      .filter((coord): coord is [number, number] => Array.isArray(coord) && coord.length >= 2)
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
