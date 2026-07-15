import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nhịp Ngày — Việc rõ, lòng nhẹ",
    short_name: "Nhịp Ngày",
    description: "Ứng dụng lập kế hoạch và chuẩn bị công việc theo ngày, dùng được cả ngoại tuyến.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4EBDD",
    theme_color: "#F4EBDD",
    lang: "vi",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
