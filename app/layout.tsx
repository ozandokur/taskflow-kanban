import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TaskFlow MVP',
  description: 'Kanban proje yönetim tahtası',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
