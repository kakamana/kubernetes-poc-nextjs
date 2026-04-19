import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoroHub Functional POC",
  description:
    "Next.js + PostgreSQL demo prepared for deployment on MoroHub Kubernetes-as-a-Service",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
