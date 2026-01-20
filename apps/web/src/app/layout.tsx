import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ObstacleProvider } from '@/context/ObstacleContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Aerovert - Airspace Intelligence',
  description: 'Germany Airspace Obstacle Intelligence Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ObstacleProvider>
          {children}
        </ObstacleProvider>
      </body>
    </html>
  );
}