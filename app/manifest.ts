import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pinch My Pony",
    short_name: "Pinch My Pony",
    description: "Borrow, share and connect with the equestrian community.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f1e7",
    theme_color: "#173d2c",
    icons: [{ src: "/pmp-logo-web.png", sizes: "512x512", type: "image/png" }],
  };
}
