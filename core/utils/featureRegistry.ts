// Feature Registry System
import { Feature } from '../types/feature';

class FeatureRegistry {
  private features: Map<string, Feature> = new Map();

  /**
   * Register a feature
   */
  register(feature: Feature): void {
    if (this.features.has(feature.id)) {
      console.warn(`Feature ${feature.id} is already registered. Overwriting...`);
    }

    this.features.set(feature.id, feature);
    console.log(`[FeatureRegistry] Registered feature: ${feature.id} (${feature.name} v${feature.version})`);
  }

  /**
   * Get a feature by ID
   */
  get(featureId: string): Feature | undefined {
    return this.features.get(featureId);
  }

  /**
   * Get all registered features
   */
  getAll(): Feature[] {
    return Array.from(this.features.values());
  }

  /**
   * Check if a feature exists
   */
  has(featureId: string): boolean {
    return this.features.has(featureId);
  }

  /**
   * Unregister a feature
   */
  unregister(featureId: string): boolean {
    return this.features.delete(featureId);
  }

  /**
   * Get feature IDs
   */
  getFeatureIds(): string[] {
    return Array.from(this.features.keys());
  }

  /**
   * Validate feature config against schema
   */
  validateConfig(featureId: string, config: Record<string, any>): { valid: boolean; errors: string[] } {
    const feature = this.features.get(featureId);
    if (!feature) {
      return { valid: false, errors: [`Feature ${featureId} not found`] };
    }

    const errors: string[] = [];
    const schema = feature.configSchema;

    // Check required fields
    Object.entries(schema).forEach(([key, field]) => {
      if (field.required && !(key in config)) {
        errors.push(`Missing required field: ${key}`);
      }
    });

    // Type validation could be added here
    // For now, just check required fields

    return { valid: errors.length === 0, errors };
  }
}

// Singleton instance
const registry = new FeatureRegistry();

/**
 * Register a feature
 */
export function registerFeature(feature: Feature): void {
  registry.register(feature);
}

/**
 * Get a feature by ID
 */
export function getFeature(featureId: string): Feature | undefined {
  return registry.get(featureId);
}

/**
 * Get all registered features
 */
export function getAllFeatures(): Feature[] {
  return registry.getAll();
}

/**
 * Check if a feature exists
 */
export function hasFeature(featureId: string): boolean {
  return registry.has(featureId);
}

/**
 * Get all feature IDs
 */
export function getFeatureIds(): string[] {
  return registry.getFeatureIds();
}

/**
 * Validate feature config
 */
export function validateFeatureConfig(featureId: string, config: Record<string, any>) {
  return registry.validateConfig(featureId, config);
}

export default registry;
