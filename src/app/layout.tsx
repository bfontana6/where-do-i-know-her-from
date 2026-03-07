import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: "Where Do I Know Her From?",
  description: "Take a picture of an actor and find out where you've seen them in your watch history.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Who's That?",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.className} bg-black text-white antialiased min-h-screen flex flex-col selection:bg-indigo-500/30`}>
        {children}
      </body>
    </html>
  );
}
