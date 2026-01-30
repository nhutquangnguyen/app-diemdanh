'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Store } from '@/types';

interface Props {
  workspaceId: string;
  workspace: Store;
}

export default function BusinessWorkspace({ workspaceId, workspace }: Props) {
  const router = useRouter();

  useEffect(() => {
    // Redirect to old business route for now
    // TODO: Migrate business workspace to new structure later
    router.push(`/owner/stores/${workspaceId}`);
  }, [workspaceId, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
