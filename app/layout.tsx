import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { UnitProvider } from "./context/UnitContext";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "ForRad Weather",
  description: "Birmingham Weather Radar and Forecast",
};

// layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Instead of className={archivo.variable}, 
         we apply the font's actual class name directly to the body 
      */}
      <body
        className={`${archivo.className} antialiased bg-slate-900 text-white min-h-screen`}
      >
        <UnitProvider>{children}</UnitProvider>
      </body>
    </html>
  );
}
