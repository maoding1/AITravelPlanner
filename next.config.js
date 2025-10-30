/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      const currentExternals = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [...currentExternals, "ws"];
    }

    return config;
  },
};

module.exports = nextConfig;
