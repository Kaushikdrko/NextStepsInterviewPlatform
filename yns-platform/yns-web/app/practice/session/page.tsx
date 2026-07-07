import { Suspense } from 'react';

import { PracticeSession } from '@/components/practice/PracticeSession';

export default function PracticeSessionPage() {
  return (
    <Suspense fallback={null}>
      <PracticeSession />
    </Suspense>
  );
}
