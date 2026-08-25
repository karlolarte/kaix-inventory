import type { Metadata, Viewport } from 'next'
import ServiceWorkerRegister from '../components/ServiceWorkerRegister'
import './globals.css'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'Kaix Custom | Inventory',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kaix Inventory',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#863bff',
}

// Runs before paint so the page never flashes the wrong theme — reads the
// same 'kaix-theme' localStorage key ThemeToggle writes, same as index.html
// did for the Vite build.
const themeInitScript = `(function () {
  var stored = localStorage.getItem('kaix-theme');
  var isDark = stored === 'light' || stored === 'dark' ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', isDark);
})();`

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}

export default RootLayout
