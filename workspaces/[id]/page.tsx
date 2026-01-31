'use client';

import { useParams } from 'next/navigation';
import { useWorkspace } from '@/core/hooks/useWorkspace';
import { WorkspaceShell } from '@/core/components/WorkspaceShell';

/**
 * Unified Workspace Page
 *
 * This single page handles all workspace types (business, education, project, event, etc.)
 * by loading the appropriate plugin based on the workspace.workspace_type field in the database.
 *
 * The plugin system automatically:
 * - Loads the correct features for the workspace type
 * - Renders the appropriate tabs
 * - Applies workspace-specific adapters
 * - Uses the right components for each feature
 */
export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const { workspace, plugin, loading, error } = useWorkspace(workspaceId);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Workspace</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Not found state
  if (!workspace) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow">
          <div className="text-gray-400 text-5xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Workspace Not Found</h2>
          <p className="text-gray-600 mb-4">
            The workspace you're looking for doesn't exist or has been deleted.
          </p>
          <a
            href="/owner"
            className="inline-block px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Plugin not found state
  if (!plugin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow">
          <div className="text-yellow-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Plugin Not Found</h2>
          <p className="text-gray-600 mb-4">
            No plugin registered for workspace type: <strong>{workspace.workspace_type || 'unknown'}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-4">
            This workspace type is not yet supported. Please register the appropriate plugin.
          </p>
          <a
            href="/owner"
            className="inline-block px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Render workspace with plugin
  return <WorkspaceShell workspace={workspace} plugin={plugin} />;
}
