/**
 * Hosts the hero carousel is allowed to load photos from.
 *
 * next/image refuses any remote host that is not listed here, which is what
 * stops the image optimiser being used as a free proxy for the whole web. Add
 * the host of wherever the yatra photos live, comma separated.
 */
const imageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The MongoDB driver must run as a real Node module, not be bundled.
  serverExternalPackages: ["mongodb"],

  images: {
    remotePatterns: imageHosts.map((hostname) => ({
      protocol: "https",
      hostname,
    })),
  },

  async headers() {
    return [
      {
        // ID photos and traveller data must never be cached by a CDN or
        // proxy between us and the admin's browser.
        source: "/api/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, private" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
