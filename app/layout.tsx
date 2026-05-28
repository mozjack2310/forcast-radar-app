import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { UnitProvider } from "./context/UnitContext";
import { ThemeProvider } from "./components/ThemeProvider";
import Navbar from "./components/Navbar";

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
    <html lang="en" suppressHydrationWarning>
      {/* Instead of className={archivo.variable}, 
         we apply the font's actual class name directly to the body 
      */}
      <body
        className={`${archivo.className} antialiased bg-white dark:bg-slate-900 dark:text-white transition-colors duration-300 min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
        >
          <UnitProvider>
            <Navbar />
            <main className="p-8 max-w-7xl mx-auto">{children}</main>
          </UnitProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
