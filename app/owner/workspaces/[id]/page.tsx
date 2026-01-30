'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Store } from '@/types';
import Header from '@/components/Header';

// Import education components
import EducationWorkspace from '@/components/education/EducationWorkspace';

// Import business components (we'll create a wrapper for the old store page)
import BusinessWorkspace from '@/components/business/BusinessWorkspace';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [workspace, setWorkspace] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspace();
  }, [workspaceId]);

  async function loadWorkspace() {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', workspaceId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;

      if (!data) {
        router.push('/owner');
        return;
      }

      setWorkspace(data);
    } catch (error) {
      console.error('Error loading workspace:', error);
      router.push('/owner');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Header />
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!workspace) return null;

  // Render based on workspace type
  if (workspace.workspace_type === 'education') {
    return <EducationWorkspace workspaceId={workspaceId} workspace={workspace} />;
  } else {
    return <BusinessWorkspace workspaceId={workspaceId} workspace={workspace} />;
  }
}
