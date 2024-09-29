// app/layout.js
import "./globals.css";

export const metadata = {
  title: "ZeroRoom",
  description: "A simple and secure video conferencing app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}