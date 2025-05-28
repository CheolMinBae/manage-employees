import { requireSession } from "@libs/auth/requireSession";
import { Metadata } from "next";
import ClientThemeProvider from "./components/ClientThemeProvider";

export const metadata: Metadata = {
  title: "Seed and Water Bakery Cafe - Employee Scheduling",
  description: "Employee scheduling system for Seed and Water Bakery Cafe",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const session = await requireSession();
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
