import type { TouringHub } from '@/types'

export const TOURING_HUBS: TouringHub[] = [
  { id: 'chicago', name: 'Chicago, IL', latitude: 41.8781, longitude: -87.6298, region: 'Midwest' },
  { id: 'minneapolis', name: 'Minneapolis, MN', latitude: 44.9778, longitude: -93.2650, region: 'Midwest' },
  { id: 'st_paul', name: 'St. Paul, MN', latitude: 44.9537, longitude: -93.0900, region: 'Midwest' },
  { id: 'kansas_city', name: 'Kansas City, MO', latitude: 39.0997, longitude: -94.5786, region: 'Midwest' },
  { id: 'st_louis', name: 'St. Louis, MO', latitude: 38.6270, longitude: -90.1994, region: 'Midwest' },
  { id: 'milwaukee', name: 'Milwaukee, WI', latitude: 43.0389, longitude: -87.9065, region: 'Midwest' },
  { id: 'omaha', name: 'Omaha, NE', latitude: 41.2565, longitude: -95.9345, region: 'Midwest' },
  { id: 'madison', name: 'Madison, WI', latitude: 43.0731, longitude: -89.4012, region: 'Midwest' },
  { id: 'detroit', name: 'Detroit, MI', latitude: 42.3314, longitude: -83.0458, region: 'Midwest' },
  { id: 'columbus', name: 'Columbus, OH', latitude: 39.9612, longitude: -82.9988, region: 'Midwest' },
  { id: 'indianapolis', name: 'Indianapolis, IN', latitude: 39.7684, longitude: -86.1581, region: 'Midwest' },
  { id: 'cleveland', name: 'Cleveland, OH', latitude: 41.4993, longitude: -81.6944, region: 'Midwest' },
  { id: 'pittsburgh', name: 'Pittsburgh, PA', latitude: 40.4406, longitude: -79.9959, region: 'Midwest' },
  { id: 'new_york', name: 'New York, NY', latitude: 40.7128, longitude: -74.0060, region: 'Northeast' },
  { id: 'boston', name: 'Boston, MA', latitude: 42.3601, longitude: -71.0589, region: 'Northeast' },
  { id: 'philadelphia', name: 'Philadelphia, PA', latitude: 39.9526, longitude: -75.1652, region: 'Northeast' },
  { id: 'washington_dc', name: 'Washington, DC', latitude: 38.9072, longitude: -77.0369, region: 'Northeast' },
  { id: 'atlanta', name: 'Atlanta, GA', latitude: 33.7490, longitude: -84.3880, region: 'Southeast' },
  { id: 'nashville', name: 'Nashville, TN', latitude: 36.1627, longitude: -86.7816, region: 'Southeast' },
  { id: 'charlotte', name: 'Charlotte, NC', latitude: 35.2271, longitude: -80.8431, region: 'Southeast' },
  { id: 'miami', name: 'Miami, FL', latitude: 25.7617, longitude: -80.1918, region: 'Southeast' },
  { id: 'new_orleans', name: 'New Orleans, LA', latitude: 29.9511, longitude: -90.0715, region: 'Southeast' },
  { id: 'tampa', name: 'Tampa, FL', latitude: 27.9506, longitude: -82.4572, region: 'Southeast' },
  { id: 'dallas', name: 'Dallas, TX', latitude: 32.7767, longitude: -96.7970, region: 'Texas' },
  { id: 'fort_worth', name: 'Fort Worth, TX', latitude: 32.7555, longitude: -97.3308, region: 'Texas' },
  { id: 'houston', name: 'Houston, TX', latitude: 29.7604, longitude: -95.3698, region: 'Texas' },
  { id: 'austin', name: 'Austin, TX', latitude: 30.2672, longitude: -97.7431, region: 'Texas' },
  { id: 'san_antonio', name: 'San Antonio, TX', latitude: 29.4241, longitude: -98.4936, region: 'Texas' },
  { id: 'denver', name: 'Denver, CO', latitude: 39.7392, longitude: -104.9903, region: 'Mountain' },
  { id: 'salt_lake', name: 'Salt Lake City, UT', latitude: 40.7608, longitude: -111.8910, region: 'Mountain' },
  { id: 'phoenix', name: 'Phoenix, AZ', latitude: 33.4484, longitude: -112.0740, region: 'Mountain' },
  { id: 'tucson', name: 'Tucson, AZ', latitude: 32.2226, longitude: -110.9747, region: 'Mountain' },
  { id: 'albuquerque', name: 'Albuquerque, NM', latitude: 35.0844, longitude: -106.6504, region: 'Mountain' },
  { id: 'los_angeles', name: 'Los Angeles, CA', latitude: 34.0522, longitude: -118.2437, region: 'West Coast' },
  { id: 'san_diego', name: 'San Diego, CA', latitude: 32.7157, longitude: -117.1611, region: 'West Coast' },
  { id: 'san_francisco', name: 'San Francisco, CA', latitude: 37.7749, longitude: -122.4194, region: 'West Coast' },
  { id: 'seattle', name: 'Seattle, WA', latitude: 47.6062, longitude: -122.3321, region: 'West Coast' },
  { id: 'portland', name: 'Portland, OR', latitude: 45.5051, longitude: -122.6750, region: 'West Coast' },
  { id: 'sacramento', name: 'Sacramento, CA', latitude: 38.5816, longitude: -121.4944, region: 'West Coast' },
  { id: 'toronto', name: 'Toronto, ON', latitude: 43.6532, longitude: -79.3832, region: 'Canada' },
  { id: 'montreal', name: 'Montreal, QC', latitude: 45.5017, longitude: -73.5673, region: 'Canada' },
  { id: 'vancouver', name: 'Vancouver, BC', latitude: 49.2827, longitude: -123.1207, region: 'Canada' },
]

const MAX_HUB_DISTANCE_MI = 350
const DEDUP_RADIUS_MI = 30

function haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function getNearestHubs(lat: number, lng: number, count = 10): TouringHub[] {
  const withDist = TOURING_HUBS
    .map(hub => ({ hub, distance: haversineDistanceMiles(lat, lng, hub.latitude, hub.longitude) }))
    .filter(h => h.distance <= MAX_HUB_DISTANCE_MI)
    .sort((a, b) => a.distance - b.distance)

  const kept: typeof withDist = []
  for (const entry of withDist) {
    const tooClose = kept.some(k => haversineDistanceMiles(entry.hub.latitude, entry.hub.longitude, k.hub.latitude, k.hub.longitude) < DEDUP_RADIUS_MI)
    if (!tooClose) kept.push(entry)
    if (kept.length >= count) break
  }
  return kept.map(e => e.hub)
}

export function getAllHubsWithinRadius(lat: number, lng: number, radiusMi = MAX_HUB_DISTANCE_MI): TouringHub[] {
  return TOURING_HUBS
    .filter(h => haversineDistanceMiles(lat, lng, h.latitude, h.longitude) <= radiusMi)
    .sort((a, b) => haversineDistanceMiles(lat, lng, a.latitude, a.longitude) - haversineDistanceMiles(lat, lng, b.latitude, b.longitude))
}

export function getEnabledHubs(ids: string[]): TouringHub[] {
  const idSet = new Set(ids)
  return TOURING_HUBS.filter(h => idSet.has(h.id))
}

export { haversineDistanceMiles }
