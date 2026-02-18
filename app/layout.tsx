import { Metadata } from "next";
import ClientThemeProvider from "./components/ClientThemeProvider";

export const metadata: Metadata = {
  title: "M Team Scheduler",
  description: "Employee scheduling system for Seed and Water Bakery Cafe",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientThemeProvider>
          {children}
        </ClientThemeProvider>
      </body>
    </html>
  );
}
