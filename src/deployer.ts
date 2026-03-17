/**
 * JXR.js — Wranglerless Deployer
 * Deploy projects to JXR Studios' Cloudflare infrastructure without wrangler.
 * Users only need a JXR API key - no Cloudflare account required.
 */

import { readFile, readdir, stat } from "fs/promises";
import path from "path";
import { createWriteStream, existsSync } from "fs";
import { spawn } from "child_process";

export interface DeployConfig {
  projectId?: string;
  environment?: 'production' | 'staging' | 'preview';
  branch?: string;
}

export interface DeployResult {
  success: boolean;
  url: string;
  deploymentId: string;
  timestamp: string;
  logs: string[];
}

export interface DeploymentStatus {
  status: 'pending' | 'building' | 'deployed' | 'failed';
  progress: number;
  url?: string;
  error?: string;
}

/**
 * JXRDeployer — Deploy to JXR Cloudflare infrastructure
 * No wrangler config needed. Just your JXR API key.
 */
export class JXRDeployer {
  private apiKey: string;
  private projectId: string;

  constructor(apiKey: string, projectId?: string) {
    this.apiKey = apiKey;
    this.projectId = projectId || this.generateProjectId();
  }

  /**
   * Auto-detect build output directory
   * Checks dist/, build/, out/, or any directory with index.html
   */
  async detectBuildDir(projectPath: string = '.'): Promise<string | null> {
    const possibleDirs = ['dist', 'build', 'out'];
    
    // Check standard build directories
    for (const dir of possibleDirs) {
      const fullPath = path.resolve(projectPath, dir);
      if (existsSync(fullPath)) {
        // Verify it has index.html
        if (existsSync(path.join(fullPath, 'index.html'))) {
          return fullPath;
        }
      }
    }
    
    // Search for any directory with index.html
    try {
      const entries = await readdir(projectPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const dirPath = path.join(projectPath, entry.name);
          if (existsSync(path.join(dirPath, 'index.html'))) {
            return dirPath;
          }
        }
      }
    } catch {
      // Ignore errors
    }
    
    return null;
  }

  /**
   * Detect if running on Cloudflare Pages
   */
  isCloudflarePages(): boolean {
    return process.env.CF_PAGES === '1' || !!process.env.CF_PAGES_URL;
  }

  /**
   * Get project name from package.json or directory
   */
  async getProjectName(projectPath: string = '.'): Promise<string> {
    // Check CF_PAGES_PROJECT_NAME first
    if (process.env.CF_PAGES_PROJECT_NAME) {
      return process.env.CF_PAGES_PROJECT_NAME;
    }
    
    // Try to read from package.json
    try {
      const pkgPath = path.join(projectPath, 'package.json');
      const pkgContent = await readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(pkgContent);
      if (pkg.name) {
        return pkg.name;
      }
    } catch {
      // Ignore errors
    }
    
    // Fall back to directory name
    return path.basename(path.resolve(projectPath));
  }

  /**
   * Deploy to Cloudflare Pages
   */
  async deployToCloudflarePages(projectPath: string = '.', config: DeployConfig = {}): Promise<DeployResult> {
    const logs: string[] = [];
    
    try {
      // Auto-detect build directory
      const buildDir = await this.detectBuildDir(projectPath);
      if (!buildDir) {
        throw new Error('No build output found. Run "jxr build" first.');
      }
      logs.push(`📁 Build directory: ${buildDir}`);
      
      // Get project name
      const projectName = await this.getProjectName(projectPath);
      logs.push(`📦 Project: ${projectName}`);
      
      // Check for manifest
      const manifestPath = path.join(buildDir, 'jxr-manifest.json');
      if (existsSync(manifestPath)) {
        const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
        logs.push(`📋 Manifest: ${manifest.platform} platform, ${manifest.files?.length || 0} files`);
      }
      
      // Determine URL
      const env = config.environment || 'production';
      const url = `https://${projectName}.app.jxrstudios.online`;
      logs.push(`🌐 URL: ${url}`);
      
      // If running on Cloudflare Pages, the deployment is automatic
      if (this.isCloudflarePages()) {
        logs.push('☁️  Cloudflare Pages auto-detected');
        logs.push('✅ Deployment ready - build output will be deployed automatically');
        
        return {
          success: true,
          url,
          deploymentId: `cf-pages-${Date.now()}`,
          timestamp: new Date().toISOString(),
          logs,
        };
      }
      
      // Manual deployment via JXR API
      return await this.deploy(buildDir, { ...config, projectId: projectName });
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logs.push(`❌ Error: ${errorMsg}`);
      return {
        success: false,
        url: '',
        deploymentId: '',
        timestamp: new Date().toISOString(),
        logs,
      };
    }
  }

  /**
   * Deploy the current project to JXR infrastructure
   */
  async deploy(projectPath: string, config: DeployConfig = {}): Promise<DeployResult> {
    const env = config.environment || 'production';
    const branch = config.branch || 'main';
    const pid = config.projectId || this.projectId;
    
    console.log(`🚀 Deploying to JXR ${env}...`);
    
    const logs: string[] = [];
    
    try {
      // Verify project path exists
      await stat(projectPath);
      logs.push(`📁 Deploying from: ${projectPath}`);
      
      // Create tarball of build files
      const tarballPath = await this.createTarball(projectPath);
      logs.push(`📦 Created tarball: ${tarballPath}`);
      
      // Upload tarball
      const uploadResult = await this.uploadTarball(tarballPath, pid, env, branch);
      logs.push(`☁️  Uploaded to JXR`);
      
      // Get deployment URL
      const url = `https://${pid}.app.jxrstudios.online`;
      logs.push(`🌐 Live at: ${url}`);
      
      return {
        success: true,
        url,
        deploymentId: uploadResult.deploymentId,
        timestamp: new Date().toISOString(),
        logs,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logs.push(`❌ Error: ${errorMsg}`);
      return {
        success: false,
        url: '',
        deploymentId: '',
        timestamp: new Date().toISOString(),
        logs,
      };
    }
  }

  /**
   * Create a tarball of the build directory
   */
  private async createTarball(projectPath: string): Promise<string> {
    const tarballPath = path.join(process.cwd(), '.jxr-deploy.tar.gz');
    
    return new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-czf', tarballPath, '-C', projectPath, '.']);
      
      tar.on('close', (code) => {
        if (code === 0) {
          resolve(tarballPath);
        } else {
          reject(new Error(`tar exited with code ${code}`));
        }
      });
      
      tar.on('error', reject);
    });
  }

  /**
   * Upload tarball to JXR API
   */
  private async uploadTarball(
    tarballPath: string, 
    projectId: string, 
    environment: string,
    branch: string
  ): Promise<{ deploymentId: string }> {
    const formData = new FormData();
    
    const fileContent = await readFile(tarballPath);
    const blob = new Blob([fileContent]);
    
    formData.append('build', blob, 'build.tar.gz');
    formData.append('projectId', projectId);
    formData.append('environment', environment);
    formData.append('branch', branch);
    
    const response = await fetch('https://jxrstudios.workers.dev/v1/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return { deploymentId: result.deploymentId };
  }

  /**
   * Get deployment status
   */
  async getStatus(deploymentId: string): Promise<DeploymentStatus> {
    const response = await fetch(`https://jxrstudios.workers.dev/v1/deployments/${deploymentId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * List all deployments for a project
   */
  async listDeployments(projectId?: string): Promise<Array<{
    id: string;
    url: string;
    environment: string;
    createdAt: string;
    status: string;
  }>> {
    const pid = projectId || this.projectId;
    
    const response = await fetch(`https://jxrstudios.workers.dev/v1/projects/${pid}/deployments`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list deployments: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Rollback to a previous deployment
   */
  async rollback(deploymentId: string): Promise<DeployResult> {
    const response = await fetch(`https://jxrstudios.workers.dev/v1/deployments/${deploymentId}/rollback`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Rollback failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      url: result.url,
      deploymentId: result.deploymentId,
      timestamp: new Date().toISOString(),
      logs: ['Rollback successful'],
    };
  }

  private generateProjectId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `jxr-${timestamp}-${random}`;
  }
}

/** Global deployer singleton */
export const jxrDeployer = new JXRDeployer(
  process.env.JXR_API_KEY || '',
  process.env.JXR_PROJECT_ID
);
