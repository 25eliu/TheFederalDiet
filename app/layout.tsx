import type { ReactNode } from "react";

export const metadata = {
  title: "The Federal Diet",
  description: "How federally fed is your favorite company?",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
