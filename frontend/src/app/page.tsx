import { redirect } from 'next/navigation';

// Root redirects to the log screen (main entry point)
// Middleware handles auth + onboarding checks
export default function RootPage() {
  redirect('/log');
}
