// Internal AI Platform (Restarted)
import { Metadata } from 'next';
import { ThemeProvider } from '@must-iq-web/components/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Must-IQ | Internal AI Platform',
  description: 'Internal knowledge base and AI assistance for Must Company',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'Must-IQ | Internal AI Platform',
    description: 'Internal knowledge base and AI assistance for Must Company',
    images: [{ url: '/icon.svg', width: 24, height: 24, alt: 'Must Company' }],
  },
  twitter: {
    card: 'summary',
    images: ['/icon.svg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-bg text-ink font-body">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
