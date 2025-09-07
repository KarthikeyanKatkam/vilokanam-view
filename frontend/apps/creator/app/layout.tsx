import 'ui/globals.css';

export const metadata = {
  title: 'Vilokanam Creator Dashboard',
  description: 'Manage your live streams and interact with your audience',
};

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0e0e10]">
        {children}
      </body>
    </html>
  );
}