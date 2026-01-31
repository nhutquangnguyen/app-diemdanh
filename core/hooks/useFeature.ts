'use client';

import { useMemo } from 'react';
import { Feature, FeatureConfig } from '../types/feature';
import { WorkspacePlugin } from '../types/plugin';
import { getFeature } from '../utils/featureRegistry';

interface UseFeatureOptions {
  plugin?: WorkspacePlugin | null;
  featureId: string;
}

interface UseFeatureResult {
  feature: Feature | null;
  config: Record<string, any>;
  enabled: boolean;
  adapter: any;
}

/**
 * Hook to check if a feature is enabled and get its configuration
 *
 * @param options - Feature options including plugin and feature ID
 * @returns Feature data, configuration, enabled status, and adapter
 */
export function useFeature({ plugin, featureId }: UseFeatureOptions): UseFeatureResult {
  const result = useMemo(() => {
    // Get feature from registry
    const feature = getFeature(featureId);

    if (!feature) {
      console.warn(`Feature not found: ${featureId}`);
      return {
        feature: null,
        config: {},
        enabled: false,
        adapter: undefined,
      };
    }

    // If no plugin, return feature with defaults
    if (!plugin) {
      return {
        feature,
        config: getDefaultConfig(feature),
        enabled: false,
        adapter: undefined,
      };
    }

    // Find feature config in plugin
    const featureConfig = plugin.config.features.find(
      (f: FeatureConfig) => f.id === featureId
    );

    if (!featureConfig) {
      console.warn(`Feature ${featureId} not configured in plugin ${plugin.id}`);
      return {
        feature,
        config: getDefaultConfig(feature),
        enabled: false,
        adapter: undefined,
      };
    }

    // Merge feature defaults with plugin config
    const config = {
      ...getDefaultConfig(feature),
      ...(featureConfig.config || {}),
    };

    // Get adapter if exists
    const adapter = plugin.adapters[featureId];

    return {
      feature,
      config,
      enabled: featureConfig.enabled !== false, // Default to enabled
      adapter,
    };
  }, [plugin, featureId]);

  return result;
}

/**
 * Get default config from feature schema
 */
function getDefaultConfig(feature: Feature): Record<string, any> {
  const defaults: Record<string, any> = {};

  Object.entries(feature.configSchema).forEach(([key, field]) => {
    if (field.default !== undefined) {
      defaults[key] = field.default;
    }
  });

  return defaults;
}
