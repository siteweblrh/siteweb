'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { EngagementForm } from '@/components/lrh/engagement/EngagementForm';
import { saveEngagementDraft, submitEngagement } from '@/lib/actions/engagement';
import type { EngagementData } from '@/lib/engagement/schema';

type Props = {
  clubId: string;
  season: string;
  initialData: EngagementData;
  initialDecl: { signedByName: string; signedCity: string; paymentMethod: 'TRANSFER' | 'CHECK' | null };
  status: 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'REJECTED';
  rejectedReason: string | null;
};

export function ManagerEngagementClient({ clubId, season, initialData, initialDecl, status, rejectedReason }: Props) {
  const router = useRouter();

  return (
    <EngagementForm
      season={season}
      status={status}
      rejectedReason={rejectedReason}
      initialData={initialData}
      initialDecl={initialDecl}
      saveDraft={async (data) => {
        await saveEngagementDraft(clubId, data);
        router.refresh();
      }}
      submit={async (data, decl) => {
        await submitEngagement(clubId, data, decl);
        router.refresh();
      }}
    />
  );
}
