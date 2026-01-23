/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We explicitly allow the API container to talk to us if needed
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://api:8000/api/v1/:path*', // Proxy to Backend
      },
    ]
  },
};

export default nextConfig;