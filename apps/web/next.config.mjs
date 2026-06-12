/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@zazaphi/contracts",
    "@zazaphi/core",
    "@zazaphi/gateway",
    "@zazaphi/context",
    "@zazaphi/economics",
    "@zazaphi/sandbox",
    "@zazaphi/services",
    "@zazaphi/deploy",
  ],
};
export default nextConfig;
