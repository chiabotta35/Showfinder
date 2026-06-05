import type { TouringHub } from '@/types'

export const TOURING_HUBS: TouringHub[] = [
  { id: 'chicago', name: 'Chicago, IL', latitude: 41.8781, longitude: -87.6298, region: 'Midwest' },
  { id: 'minneapolis', name: 'Minneapolis, MN', latitude: 44.9778, longitude: -93.2650, region: 'Midwest' },
  { id: 'kansas_city', name: 'Kansas City, MO', latitude: 39.0997, longitude: -94.5786, region: 'Midwest' },
  { id: 'st_louis', name: 'St. Louis, MO', latitude: 38.6270, longitude: -90.1994, region: 'Midwest' },
  { id: 'milwaukee', name: 'Milwaukee, WI', latitude: 43.0389, longitude: -87.9065, region: 'Midwest' },
  { id: 'omaha', name: 'Omaha, NE', latitude: 41.2565, longitude: -95.9345, region: 'Midwest' },
  { id: 'madison', name: 'Madison, WI', latitude: 43.0731, longitude: -89.4012, region: 'Midwest' },
  { id: 'new_york', name: 'New York, NY', latitude: 40.7128, longitude: -74.0060, region: 'Northeast' },
  { id: 'boston', name: 'Boston, MA', latitude: 42.3601, longitude: -71.0589, region: 'Northeast' },
  { id: 'philadelphia', name: 'Philadelphia, PA', latitude: 39.9526, longitude: -75.1652, region: 'Northeast' },
  { id: 'washington_dc', name: 'Washington, DC', latitude: 38.9072, longitude: -77.0369, region: 'Northeast' },
  { id: 'atlanta', name: 'Atlanta, GA', latitude: 33.7490, longitude: -84.3880, region: 'Southeast' },
  { id: 'nashville', name: 'Nashville, TN', latitude: 36.1627, longitude: -86.7816, region: 'Southeast' },
  { id: 'charlotte', name: 'Charlotte, NC', latitude: 35.2271, longitude: -80.8431, region: 'Southeast' },
  { id: 'miami', name: 'Miami, FL', latitude: 25.7617, longitude: -80.1918, region: 'Southeast' },
  { id: 'new_orleans', name: 'New Orleans, LA', latitude: 29.9511, longitude: -90.0715, region: 'Southeast' },
  { id: 'dallas', name: 'Dallas, TX', latitude: 32.7767, longitude: -96.7970, region: 'Texas' },
  { id: 'houston', name: 'Houston, TX', latitude: 29.7604, longitude: -95.3698, region: 'Texas' },
  { id: 'austin', name: 'Austin, TX', latitude: 30.2672, longitude: -97.7431, region: 'Texas' },
  { id: 'denver', name: 'Denver, CO', latitude: 39.7392, longitude: -104.9903, region: 'Mountain' },
  { id: 'salt_lake', name: 'Salt Lake City, UT', latitude: 40.7608, longitude: -111.8910, region: 'Mountain' },
  { id: 'phoenix', name: 'Phoenix, AZ', latitude: 33.4484, longitude: -112.0740, region: 'Mountain' },
  { id: 'los_angeles', name: 'Los Angeles, CA', latitude: 34.0522, longitude: -118.2437, region: 'West Coast' },
  { id: 'san_francisco', name: 'San Francisco, CA', latitude: 37.7749, longitude: -122.4194, region: 'West Coast' },
  { id: 'seattle', name: 'Seattle, WA', latitude: 47.6062, longitude: -122.3321, region: 'West Coast' },
  { id: 'portland', name: 'Portland, OR', latitude: 45.5051, longitude: -122.6750, region: 'West Coast' },
  { id: 'toronto', name: 'Toronto, ON', latitude: 43.6532, longitude: -79.3832, region: 'Canada' },
  { id: 'montreal', name: 'Montreal, QC', latitude: 45.5017, longitude: -73.5673, region: 'Canada' },
  { id: 'vancouver', name: 'Vancouver, BC', latitude: 49.2827, longitude: -123.1207, region: 'Canada' },
]

export function getNearestHubs(lat: number, lng: number, count = 5): TouringHub[] {
  return TOURING_HUBS
    .map(hub => ({ hub, distance: haversineDistanceMiles(lat, lng, hub.latitude, hub.longitude) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map(item => item.hub)
}

export function getEnabledHubs(ids: string[]): TouringHub[] {
  const idSet = new Set(ids)
  return TOURING_HUBS.filter(h => idSet.has(h.id))
}

export function haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
