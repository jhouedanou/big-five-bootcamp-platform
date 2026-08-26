/** @type {import('next').NextConfig} */
const nextConfig = {
  // sharp est natif : chargé à l'exécution (Node/Vercel), jamais bundlé.
  // Sur Cloudflare Workers l'import échoue et lib/image-server retombe en
  // passthrough — c'est voulu.
  serverExternalPackages: ['sharp'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig