"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home({ isParsing, setIsParsing }: { isParsing?: boolean, setIsParsing?: (isParsing: boolean) => void }) {
  const router = useRouter();

  useEffect(() => {
    router.replace('/inbox');
  }, [router]);

  return null;
}
