import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'GHL Content Tracker',
  description: 'One prompt at a time for your Facebook content calendar.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <nav className="topnav">
          <div className="topnav-inner">
            <Link href="/">Home</Link>
            <Link href="/calendar">Calendar</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/topics">Topics</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
