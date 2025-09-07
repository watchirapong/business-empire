import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import AuthProvider from "../components/AuthProvider";
import AnalyticsProvider from "../components/AnalyticsProvider";
import StructuredData from "../components/StructuredData";
import "../lib/auto-start-bot"; // Initialize auto-start

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "Hamstellar - All in One Facility for HamsterHub Members",
    template: "%s | Hamstellar"
  },
  description: "Hamstellar is the ultimate platform for HamsterHub members featuring business games, trading simulators, gacha system, university search, and community features. Join our Discord community for exclusive content and rewards.",
  keywords: [
    "HamsterHub",
    "Hamstellar", 
    "business games",
    "trading simulator",
    "stock trading",
    "forex trading",
    "crypto trading",
    "investment games",
    "gacha system",
    "university search",
    "TCAS analysis",
    "Discord community",
    "Thai students",
    "gaming platform"
  ],
  authors: [{ name: "HamsterHub Team" }],
  creator: "HamsterHub",
  publisher: "HamsterHub",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://hamsterhub.fun'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    url: 'https://hamsterhub.fun',
    title: 'Hamstellar - All in One Facility for HamsterHub Members',
    description: 'Join HamsterHub for business games, trading simulators, gacha system, university search, and exclusive Discord community features.',
    siteName: 'Hamstellar',
    images: [
      {
        url: '/hamsterhub-logo.png',
        width: 1200,
        height: 630,
        alt: 'Hamstellar - HamsterHub Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hamstellar - All in One Facility for HamsterHub Members',
    description: 'Join HamsterHub for business games, trading simulators, gacha system, university search, and exclusive Discord community features.',
    images: ['/hamsterhub-logo.png'],
    creator: '@hamsterhub',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  verification: {
    google: 'your-google-verification-code', // Add your actual verification code
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className={`${notoSansThai.variable} font-thai antialiased`}
      >
        <StructuredData type="webapplication" />
        <AuthProvider>
          <AnalyticsProvider>
            {children}
          </AnalyticsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
