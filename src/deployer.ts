/**
 * JXR.js — Wranglerless Deployer
 * Deploy projects to JXR Studios' Cloudflare infrastructure without wrangler.
 * Users only need a JXR API key - no Cloudflare account required.
 */

import { readFile, readdir, stat } from "fs/promises";
import path from "path";
import { createWriteStream } from "fs";
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
      const url = `https://${pid}.jxr.dev`;
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
