'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Workspace, WorkspaceContext } from '../types/workspace';
import { WorkspacePlugin } from '../types/plugin';
import { getPlugin } from '../utils/pluginRegistry';

interface UseWorkspaceResult {
  workspace: Workspace | null;
  plugin: WorkspacePlugin | null;
  loading: boolean;
  error?: Error;
  refresh: () => Promise<void>;
}

/**
 * Hook to load workspace data and associated plugin
 *
 * @param workspaceId - ID of the workspace to load
 * @returns Workspace data, plugin, loading state, error, and refresh function
 */
export function useWorkspace(workspaceId: string): UseWorkspaceResult {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [plugin, setPlugin] = useState<WorkspacePlugin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  async function loadWorkspace() {
    try {
      setLoading(true);
      setError(undefined);

      // Load workspace from database
      const { data, error: fetchError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', workspaceId)
        .is('deleted_at', null)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Workspace not found');

      const workspaceData = data as Workspace;
      setWorkspace(workspaceData);

      // Determine workspace type and load corresponding plugin
      // Default to 'business' if no type specified
      const workspaceType = workspaceData.workspace_type || 'business';
      const loadedPlugin = getPlugin(workspaceType);

      if (!loadedPlugin) {
        console.warn(`Plugin not found for workspace type: ${workspaceType}. Using default.`);
        // Could set a default plugin here
      }

      setPlugin(loadedPlugin || null);

      // Call plugin's onActivate hook
      if (loadedPlugin && loadedPlugin.onActivate) {
        loadedPlugin.onActivate(workspaceId);
      }

    } catch (err) {
      console.error('Error loading workspace:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (workspaceId) {
      loadWorkspace();
    }

    // Cleanup: call plugin's onDeactivate when component unmounts
    return () => {
      if (plugin && plugin.onDeactivate) {
        plugin.onDeactivate();
      }
    };
  }, [workspaceId]);

  return {
    workspace,
    plugin,
    loading,
    error,
    refresh: loadWorkspace,
  };
}
