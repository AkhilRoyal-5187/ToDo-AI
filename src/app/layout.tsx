import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI To-Do List',
  description: 'Your intelligent task organizer',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    
    <html lang="en" className="dark font-sans">
      <body>{children}</body>
    </html>
  );
}