'use client';

import Link from 'next/link';
import { BusinessProvider } from '../lib/BusinessContext';
import BusinessSwitcher from './BusinessSwitcher';

export default function AppShell({ children }) {
  return (
    <BusinessProvider>
      <nav className="topnav">
        <div className="topnav-inner">
          <Link href="/">Home</Link>
          <Link href="/calendar">Calendar</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/topics">Topics</Link>
          <Link href="/settings">Audience</Link>
          <BusinessSwitcher />
        </div>
      </nav>
      {children}
    </BusinessProvider>
  );
}
