/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // pptxgenjs có `import('node:fs')` ở nhánh chỉ chạy trên Node (ghi file ra đĩa).
      // Trên trình duyệt nó dùng blob download, nên bỏ qua các module Node này:
      // đổi "node:fs" → "fs" rồi cho fallback rỗng.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        }),
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        http: false,
        os: false,
        path: false,
        stream: false,
        zlib: false,
      };
    }
    return config;
  },
};

export default nextConfig;
