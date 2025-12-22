import type { Metadata } from "next";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { Notifications } from "@mantine/notifications";
import "dayjs/locale/de";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prophezeiung",
  description: "Prophezeiungen einreichen und bewerten",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body className="antialiased">
        <MantineProvider>
          <DatesProvider settings={{ locale: "de", firstDayOfWeek: 1 }}>
            <Notifications position="top-right" />
            {children}
          </DatesProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
