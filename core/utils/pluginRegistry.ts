// Plugin Registry System
import { WorkspacePlugin } from '../types/plugin';

class PluginRegistry {
  private plugins: Map<string, WorkspacePlugin> = new Map();

  /**
   * Register a workspace plugin
   */
  register(plugin: WorkspacePlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} is already registered. Overwriting...`);
    }

    // Call plugin's onRegister lifecycle hook
    if (plugin.onRegister) {
      plugin.onRegister();
    }

    this.plugins.set(plugin.id, plugin);
    console.log(`[PluginRegistry] Registered plugin: ${plugin.id} (${plugin.name} v${plugin.version})`);
  }

  /**
   * Get a plugin by ID
   */
  get(pluginId: string): WorkspacePlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all registered plugins
   */
  getAll(): WorkspacePlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if a plugin exists
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (plugin && plugin.onDeactivate) {
      plugin.onDeactivate();
    }
    return this.plugins.delete(pluginId);
  }

  /**
   * Get plugin IDs
   */
  getPluginIds(): string[] {
    return Array.from(this.plugins.keys());
  }
}

// Singleton instance
const registry = new PluginRegistry();

/**
 * Register a workspace plugin
 */
export function registerPlugin(plugin: WorkspacePlugin): void {
  registry.register(plugin);
}

/**
 * Get a plugin by ID
 */
export function getPlugin(pluginId: string): WorkspacePlugin | undefined {
  return registry.get(pluginId);
}

/**
 * Get all registered plugins
 */
export function getAllPlugins(): WorkspacePlugin[] {
  return registry.getAll();
}

/**
 * Check if a plugin exists
 */
export function hasPlugin(pluginId: string): boolean {
  return registry.has(pluginId);
}

/**
 * Get all plugin IDs
 */
export function getPluginIds(): string[] {
  return registry.getPluginIds();
}

export default registry;
