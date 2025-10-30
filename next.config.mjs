const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.alicdn.com",
      },
    ],
  },
};

export default nextConfig;
