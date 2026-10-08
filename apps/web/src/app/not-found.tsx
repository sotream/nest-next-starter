import Link from 'next/link';
import { buttonClasses } from '@/components/button';
import { StatusPage } from '@/components/status-page';

export default function NotFound() {
  return (
    <main>
      <StatusPage
        variant="missing"
        code="404"
        title="Page not found"
        description="The address may be mistyped, or the page has moved. Check the URL or go back to the app."
      >
        <Link href="/" className={buttonClasses()}>
          Go to vehicles
        </Link>
      </StatusPage>
    </main>
  );
}
