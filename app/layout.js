import './globals.css';
import AppShell from '../components/AppShell';

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
