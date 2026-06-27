/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // @gltf-transform/core importe `node:fs` / `node:path` au niveau module
      // (pour son NodeIO, jamais appelé côté client). Webpack ne gère pas le
      // schéma `node:` → on retire le préfixe, puis on stub fs/path à false.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        })
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
