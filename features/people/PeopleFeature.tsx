'use client';

import { useState, useEffect } from 'react';
import { FeatureProps } from '@/core/types/feature';
import PeopleListView from './PeopleListView';

export default function PeopleFeature({ workspaceId, config, adapter }: FeatureProps) {
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPeople();
  }, [workspaceId]);

  async function loadPeople() {
    try {
      const { supabase } = await import('@/lib/supabase');

      // Get table name from adapter or use default
      const peopleTable = adapter?.tables?.people || 'staff';
      const workspaceField = adapter?.tables?.workspace === 'stores' && adapter?.tables?.people === 'students'
        ? 'class_id'
        : 'store_id';

      // Load all people for this workspace
      const { data, error } = await supabase
        .from(peopleTable)
        .select('*')
        .eq(workspaceField, workspaceId)
        .order('full_name');

      if (error) throw error;

      setPeople(data || []);
    } catch (error) {
      console.error('Error loading people:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <PeopleListView
      people={people}
      config={config}
      onRefresh={loadPeople}
    />
  );
}
