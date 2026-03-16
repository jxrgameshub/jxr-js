/**
 * JXR.js — Edge OS Runtime Framework
 * A runtime for executing JavaScript at the edge with:
 * - Virtual File System
 * - JSX Transformation (zero-build)
 * - Worker Pool orchestration
 * - MoQ Transport streaming
 * - Web Crypto module integrity
 * - Server with HMR
 */

// Core runtime exports
export { WorkerPool } from './worker-pool.ts';
export type {
  WorkerMetrics,
  PoolMetrics,
  WorkerStatus,
  TaskPriority,
} from './worker-pool.ts';

export { MoQTransport } from './moq-transport.ts';
export type {
  MoQStreamMetrics,
  MoQConnectionState,
  MoQObject,
  MoQTrackNamespace,
} from './moq-transport.ts';

export { JXRCrypto, jxrCrypto } from './web-crypto.ts';
export type { ModuleHash, SignedManifest } from './web-crypto.ts';

export {
  VirtualFS,
  JSXTransformer,
  ImportMapBuilder,
  ModuleCache,
  DEFAULT_PROJECT_FILES,
} from './module-resolver.ts';
export type {
  VirtualFile,
  VirtualDirectory,
  ResolvedModule,
  ImportMap,
} from './module-resolver.ts';

export { JXRRuntime, jxrRuntime } from './runtime.ts';
export type { JXRRuntimeConfig, JXRRuntimeMetrics } from './runtime.ts';

// Transpiler
export { EnhancedTranspiler } from './enhanced-transpiler.ts';
export type { TranspilerOptions, TranspilationResult } from './enhanced-transpiler.ts';

// Entry point detection
export { findOrCreateEntryPoint } from './entry-point-detection.ts';
export type { EntryPointDetection, ProjectFile } from './entry-point-detection.ts';

// Server manager
export { JXRServerManager } from './jxr-server-manager.ts';
export type { JXRServerConfig } from './jxr-server-manager.ts';

// Deployer
export { JXRDeployer, jxrDeployer } from './deployer.ts';
export type { DeployConfig, DeployResult, DeploymentStatus } from './deployer.ts';

// Config helper
export interface JXRConfig {
  name: string;
  platform: 'web' | 'native' | 'expo' | 'cloudflare-worker' | 'deno' | 'node';
  workers?: {
    size?: number;
    enablePriority?: boolean;
    maxQueueSize?: number;
    taskTimeout?: number;
  };
  moq?: {
    enabled?: boolean;
    relayUrl?: string;
    trackPriority?: 'high' | 'normal' | 'low';
    maxSubscriptions?: number;
    reconnectDelay?: number;
  };
  crypto?: {
    enabled?: boolean;
    algorithm?: 'AES-GCM' | 'AES-CBC';
    keySize?: number;
    signing?: boolean;
    keyDerivation?: 'HKDF';
  };
  build?: {
    entry?: string;
    outDir?: string;
    minify?: boolean;
    sourcemap?: boolean;
    splitting?: 'auto' | 'manual' | false;
    target?: string[];
    external?: string[];
  };
  devServer?: {
    port?: number;
    host?: string;
    hmr?: boolean;
    open?: boolean;
    https?: boolean;
  };
  imports?: Record<string, string>;
  plugins?: any[];
}

export function defineConfig(config: JXRConfig): JXRConfig {
  return config;
}
