import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { UnitProvider } from "./context/UnitContext";
import { ThemeProvider } from "./components/ThemeProvider";
import Navbar from "./components/Navbar";
import TelemetryRail from "./components/TelemetryRail";

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
            {/* The new global flex wrapper */}
            <div className="flex min-h-screen w-full">
              {/* 1. The Fixed Left Rail */}
              <TelemetryRail />

              {/* 2. The Right-Side App Container (Pushed over to avoid the rail) */}
              <div className="flex-1 flex flex-col ml-0 lg:ml-16 xl:ml-48 transition-all duration-300 min-w-0">
                <Navbar />
                <main className="p-8 min-h-screen mx-auto w-full flex-1 bg-slate-950">
                  {children}
                </main>
              </div>
            </div>
          </UnitProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
