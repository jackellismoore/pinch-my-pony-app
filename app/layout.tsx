import "./globals.css"
import Header from "./components/Header"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh" }}>
        <Header />
        <main style={{ minHeight: "calc(100vh - 60px)" }}>{children}</main>
      </body>
    </html>
  )
}
