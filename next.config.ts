import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Vercel auto-sets VERCEL_URL to the deployment hostname (no protocol).
    // We expose it as NEXT_PUBLIC_SITE_URL so both client and server code can
    // construct absolute URLs pointing to the correct deployment, not localhost.
    // Override by setting NEXT_PUBLIC_SITE_URL directly in Vercel env vars
    // when using a custom domain (e.g. app.lebaronhills.com).
    NEXT_PUBLIC_SITE_URL: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000',
  },
};

export default nextConfig;
