export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function randomPointInRadius(center: LatLng, radiusKm: number): LatLng {
  const distanceKm = Math.sqrt(Math.random()) * radiusKm;
  const bearing = Math.random() * 2 * Math.PI;

  const lat1 = toRadians(center.lat);
  const lon1 = toRadians(center.lng);
  const angularDistance = distanceKm / EARTH_RADIUS_KM;

  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAd = Math.sin(angularDistance);
  const cosAd = Math.cos(angularDistance);

  const lat2 = Math.asin(sinLat1 * cosAd + cosLat1 * sinAd * Math.cos(bearing));
  const lon2 = lon1 + Math.atan2(Math.sin(bearing) * sinAd * cosLat1, cosAd - sinLat1 * Math.sin(lat2));

  return {
    lat: toDegrees(lat2),
    lng: ((toDegrees(lon2) + 540) % 360) - 180,
  };
}
