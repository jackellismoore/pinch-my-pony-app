import "./globals.css";

export const metadata = {
  title: "Pinch My Pony",
  description: "Borrow and share horses near you",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet/dist/leaflet.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
