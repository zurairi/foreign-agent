import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Foreign Agent · Editorial shortlist', description: 'Private newsroom monitoring for Malaysia and China. Team Foreign Agent hackathon concept.' };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
