import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Letter",
  description:
    "Paste an official letter and hear, in plain words, only what it actually says.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximum-scale: the page must remain zoomable to 200% and beyond.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Wordmark only, no navigation: there is nowhere else to go. No
            history, no settings, no account — that absence is the product's
            privacy promise made visible, not a missing feature. */}
        <header className="border-b border-rule bg-paper-raised print:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m3 6 9 6 9-6" />
              </svg>
            </span>
            <span className="text-xl font-semibold tracking-tight">The Letter</span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
