export const metadata = {
  title: "Booklub — Classement du book club",
  description: "Le classement dynamique des livres de notre book club.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
