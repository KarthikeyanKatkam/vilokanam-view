import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vilokanam Viewer',
  description: 'Pay-per-second streaming viewer',
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