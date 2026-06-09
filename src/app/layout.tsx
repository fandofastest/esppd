import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "e-SPPD KPU Kota Dumai",
  description: "Digitalisasi administrasi perjalanan dinas, SBM, dan pertanggungjawaban LPJ.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
