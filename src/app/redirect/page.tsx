"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const RedirectPage = () => {
  const router = useRouter();

  useEffect(() => {
    // Forward all query parameters to the root page
    const search = window.location.search;
    router.replace(`/${search}`);
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center p-4">
        <h1 className="text-2xl font-bold text-primary font-headline">Redirecting...</h1>
        <p className="text-muted-foreground">Please wait.</p>
      </div>
    </div>
  );
};

export default RedirectPage;
