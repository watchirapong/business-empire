import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import AuthProvider from "../components/AuthProvider";
import AnalyticsProvider from "../components/AnalyticsProvider";
import StructuredData from "../components/StructuredData";
import { ThemeProvider } from "../components/ThemeProvider";
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
        <style dangerouslySetInnerHTML={{__html: `
          /* Tailwind utilities are defined below */
          
          :root {
            --background: #0a0a0a;
            --foreground: #ededed;
          }
          
          body {
            background: var(--background);
            color: var(--foreground);
            font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow-x: hidden;
          }
          
          /* Custom scrollbar for gaming feel */
          ::-webkit-scrollbar { width: 8px; }
          ::-webkit-scrollbar-track { background: #1a1a1a; }
          ::-webkit-scrollbar-thumb { 
            background: linear-gradient(45deg, #8b5cf6, #ec4899);
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover { 
            background: linear-gradient(45deg, #7c3aed, #db2777);
          }
          
          /* Gaming-style text selection */
          ::selection {
            background: rgba(139, 92, 246, 0.3);
            color: #f3f4f6;
          }
          
          /* Custom animations */
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 5px rgba(139, 92, 246, 0.5); }
            50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.8), 0 0 30px rgba(139, 92, 246, 0.6); }
          }
          
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 5px rgba(236, 72, 153, 0.5); }
            50% { box-shadow: 0 0 20px rgba(236, 72, 153, 0.8), 0 0 30px rgba(236, 72, 153, 0.6); }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          
          /* Gaming-style utility classes */
          .glow { animation: glow 2s ease-in-out infinite alternate; }
          .pulse-glow { animation: pulse-glow 2s ease-in-out infinite alternate; }
          .float { animation: float 3s ease-in-out infinite; }
          .shimmer { 
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            background-size: 200% 100%;
            animation: shimmer 2s infinite;
          }
          .animate-blob { animation: blob 7s infinite; }
          .animation-delay-2000 { animation-delay: 2s; }
          .animation-delay-4000 { animation-delay: 4s; }
          
          /* Glassmorphism effect */
          .glass {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          /* Neon text effect */
          .neon-text {
            text-shadow: 
              0 0 5px currentColor,
              0 0 10px currentColor,
              0 0 15px currentColor,
              0 0 20px currentColor;
          }
          
          /* Gaming button styles */
          .btn-gaming {
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
          }
          
          .btn-gaming::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s;
          }
          
          .btn-gaming:hover::before {
            left: 100%;
          }
          
          /* Matrix-style background */
          .matrix-bg {
            background-image: 
              radial-gradient(circle at 25% 25%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, rgba(236, 72, 153, 0.1) 0%, transparent 50%);
          }
          
          /* Custom focus styles for accessibility */
          *:focus {
            outline: 2px solid #8b5cf6;
            outline-offset: 2px;
          }
          
          /* Smooth transitions for all elements */
          * {
            transition: color 0.3s ease, background-color 0.3s ease, border-color 0.3s ease, transform 0.3s ease;
          }
          
          /* Essential Tailwind Utilities */
          .min-h-screen { min-height: 100vh; }
          .bg-gradient-to-br { background-image: linear-gradient(to bottom right, var(--tw-gradient-stops)); }
          .from-black { --tw-gradient-from: #000; --tw-gradient-to: rgba(0, 0, 0, 0); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
          .via-gray-900 { --tw-gradient-to: rgba(17, 24, 39, 0); --tw-gradient-stops: var(--tw-gradient-from), #111827, var(--tw-gradient-to); }
          .to-black { --tw-gradient-to: #000; }
          .relative { position: relative; }
          .overflow-hidden { overflow: hidden; }
          .absolute { position: absolute; }
          .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
          .top-0 { top: 0; }
          .left-0 { left: 0; }
          .w-full { width: 100%; }
          .h-full { height: 100%; }
          .bg-\\[radial-gradient\\(circle_at_50\\%_50\\%\\,rgba\\(249\\,115\\,22\\,0\\.1\\)\\,transparent_50\\%\\)\\] { background-image: radial-gradient(circle at 50% 50%, rgba(249, 115, 22, 0.1), transparent 50%); }
          .top-1\\/4 { top: 25%; }
          .left-1\\/4 { left: 25%; }
          .w-96 { width: 24rem; }
          .h-96 { height: 24rem; }
          .bg-orange-500\\/10 { background-color: rgba(249, 115, 22, 0.1); }
          .rounded-full { border-radius: 9999px; }
          .blur-3xl { filter: blur(64px); }
          .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
          .bottom-1\\/4 { bottom: 25%; }
          .right-1\\/4 { right: 25%; }
          .bg-orange-400\\/10 { background-color: rgba(251, 146, 60, 0.1); }
          .delay-1000 { animation-delay: 1000ms; }
          .top-1\\/2 { top: 50%; }
          .left-1\\/2 { left: 50%; }
          .transform { transform: translateX(var(--tw-translate-x, 0)) translateY(var(--tw-translate-y, 0)) rotate(var(--tw-rotate, 0)) skewX(var(--tw-skew-x, 0)) skewY(var(--tw-skew-y, 0)) scaleX(var(--tw-scale-x, 1)) scaleY(var(--tw-scale-y, 1)); }
          .-translate-x-1\\/2 { --tw-translate-x: -50%; }
          .-translate-y-1\\/2 { --tw-translate-y: -50%; }
          .w-64 { width: 16rem; }
          .h-64 { height: 16rem; }
          .bg-white\\/5 { background-color: rgba(255, 255, 255, 0.05); }
          .blur-2xl { filter: blur(40px); }
          .delay-500 { animation-delay: 500ms; }
          .z-10 { z-index: 10; }
          .container { width: 100%; margin-left: auto; margin-right: auto; padding-left: 1rem; padding-right: 1rem; }
          .mx-auto { margin-left: auto; margin-right: auto; }
          .px-4 { padding-left: 1rem; padding-right: 1rem; }
          .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
          .sm\\:py-12 { padding-top: 3rem; padding-bottom: 3rem; }
          .md\\:py-16 { padding-top: 4rem; padding-bottom: 4rem; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-center { align-items: center; }
          .mb-8 { margin-bottom: 2rem; }
          .space-x-4 > * + * { margin-left: 1rem; }
          .w-12 { width: 3rem; }
          .h-12 { height: 3rem; }
          .object-contain { object-fit: contain; }
          .text-white { color: #fff; }
          .text-2xl { font-size: 1.5rem; line-height: 2rem; }
          .font-bold { font-weight: 700; }
          .bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops)); }
          .from-orange-400 { --tw-gradient-from: #fb923c; --tw-gradient-to: rgba(251, 146, 60, 0); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
          .to-orange-600 { --tw-gradient-to: #ea580c; }
          .bg-clip-text { background-clip: text; }
          .text-transparent { color: transparent; }
          .space-x-2 > * + * { margin-left: 0.5rem; }
          .bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops)); }
          .from-orange-600 { --tw-gradient-from: #ea580c; --tw-gradient-to: rgba(234, 88, 12, 0); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
          .to-orange-500 { --tw-gradient-to: #f97316; }
          .hover\\:from-orange-500:hover { --tw-gradient-from: #f97316; --tw-gradient-to: rgba(249, 115, 22, 0); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
          .hover\\:to-orange-400:hover { --tw-gradient-to: #fb923c; }
          .px-8 { padding-left: 2rem; padding-right: 2rem; }
          .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
          .rounded-xl { border-radius: 0.75rem; }
          .font-bold { font-weight: 700; }
          .transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
          .duration-300 { transition-duration: 300ms; }
          .transform { transform: translateX(var(--tw-translate-x, 0)) translateY(var(--tw-translate-y, 0)) rotate(var(--tw-rotate, 0)) skewX(var(--tw-skew-x, 0)) skewY(var(--tw-skew-y, 0)) scaleX(var(--tw-scale-x, 1)) scaleY(var(--tw-scale-y, 1)); }
          .hover\\:scale-105:hover { --tw-scale-x: 1.05; --tw-scale-y: 1.05; transform: translateX(var(--tw-translate-x, 0)) translateY(var(--tw-translate-y, 0)) rotate(var(--tw-rotate, 0)) skewX(var(--tw-skew-x, 0)) skewY(var(--tw-skew-y, 0)) scaleX(var(--tw-scale-x, 1)) scaleY(var(--tw-scale-y, 1)); }
          .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
          .hover\\:shadow-orange-500\\/25:hover { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(249, 115, 22, 0.25); }
          .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
          .text-center { text-align: center; }
          .mb-16 { margin-bottom: 4rem; }
          .inline-block { display: inline-block; }
          .via-orange-500 { --tw-gradient-to: rgba(249, 115, 22, 0); --tw-gradient-stops: var(--tw-gradient-from), #f97316, var(--tw-gradient-to); }
          .text-6xl { font-size: 3.75rem; line-height: 1; }
          .sm\\:text-7xl { font-size: 4.5rem; line-height: 1; }
          .md\\:text-8xl { font-size: 6rem; line-height: 1; }
          .lg\\:text-9xl { font-size: 8rem; line-height: 1; }
          .font-black { font-weight: 900; }
          .tracking-tight { letter-spacing: -0.025em; }
          .leading-tight { line-height: 1.25; }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}} />
      </head>
      <body
        className={`${notoSansThai.variable} font-thai antialiased`}
      >
        <StructuredData type="webapplication" />
        <ThemeProvider>
          <AuthProvider>
            <AnalyticsProvider>
              {children}
            </AnalyticsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
