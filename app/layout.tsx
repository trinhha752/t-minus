import type { Metadata } from "next";
import { Bricolage_Grotesque, Cinzel, IM_Fell_English, Inter } from "next/font/google";
import { PhoneFrame } from "@/components/run/PhoneFrame";
import { RunProvider } from "@/components/run/RunProvider";
import "./globals.css";

// Fonts from the Figma design, self-hosted by next/font.
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"] });
const imFell = IM_Fell_English({
  variable: "--font-im-fell",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "T-Minus",
  description: "Every station is a level, every delay is a boss fight.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${inter.variable} ${cinzel.variable} ${imFell.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RunProvider>
          <PhoneFrame>{children}</PhoneFrame>
        </RunProvider>
      </body>
    </html>
  );
}
