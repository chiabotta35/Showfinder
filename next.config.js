/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.NODE_ENV === 'development' && {
    // Next 15 doesn't accept CIDR notation. Add specific hostnames/IPs.
    // Override with ALLOWED_DEV_ORIGINS env var (comma-separated) for extras.
    allowedDevOrigins: [
      'localhost',
      '127.0.0.1',
      '192.168.1.76',
      ...(process.env.ALLOWED_DEV_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) ?? []),
    ],
  }),
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ...(process.env.NODE_ENV === 'production'
          ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }]
          : []),
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://lastfm.freetls.fastly.net https://*.lastfm.freetls.fastly.net",
            "connect-src 'self' https://nominatim.openstreetmap.org https://ws.audioscrobbler.com https://www.last.fm https://*.tile.openstreetmap.org",
            "worker-src blob:",
            "frame-ancestors 'none'",
          ].join('; '),
        },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
      ],
    }]
  },
  env: { NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lastfm.freetls.fastly.net' },
      { protocol: 'https', hostname: '*.lastfm.freetls.fastly.net' },
    ],
  },
}
module.exports = nextConfig
