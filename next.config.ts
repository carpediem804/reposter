import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: isDev
      ? // 개발 모드: React Refresh와 HMR을 위해 완화
        "default-src 'self'; connect-src 'self' https://openrouter.ai https://*.supabase.co http://localhost:* ws://localhost:*; img-src 'self' data: blob: https://k.kakaocdn.net http://k.kakaocdn.net; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
      : // 프로덕션 모드: 엄격한 CSP
        "default-src 'self'; connect-src 'self' https://openrouter.ai https://*.supabase.co; img-src 'self' data: blob: https://k.kakaocdn.net http://k.kakaocdn.net; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:;",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), microphone=(), camera=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "k.kakaocdn.net",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "k.kakaocdn.net",
        port: "",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
