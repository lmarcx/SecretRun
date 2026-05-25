export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#141820' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.4)' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#141820' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e2433' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#141820' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#252d3d' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1520' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1a2030' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.3)' }] },
];
