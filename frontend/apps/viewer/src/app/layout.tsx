import 'ui/globals.css';

export const metadata = {
  title: 'Vilokanam - Live Streaming Platform',
  description: 'Pay-per-second live streaming platform',
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