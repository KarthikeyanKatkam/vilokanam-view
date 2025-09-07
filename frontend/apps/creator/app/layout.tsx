import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vilokanam Creator Dashboard',
  description: 'Pay-per-second streaming creator dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}