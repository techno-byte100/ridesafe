import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPwa = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true
});

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {},
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=()' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },
};

export default withPwa(nextConfig);
