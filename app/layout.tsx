import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Estimator Pro",
  description: "Kivitelezői árajánlat-kezelő",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body style={{ margin: 0, padding: 0, background: "#09090b" }}>
        {children}
      </body>
    </html>
  )
}
