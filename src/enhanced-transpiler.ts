import * as Babel from "@babel/standalone"

export interface TranspilerOptions {
  filename: string
  presets?: string[]
  plugins?: any[]
  cache?: boolean
}

export interface TranspilationResult {
  code: string
  map?: any
  error?: Error
  cached?: boolean
}

export class EnhancedTranspiler {
  private transformCache = new Map<string, TranspilationResult>()
  private dependencyGraph = new Map<string, Set<string>>()
  private options: Partial<TranspilerOptions>
  
  constructor(options: Partial<TranspilerOptions> = {}) {
    this.options = options
  }

  transpileTypeScript(code: string, filename: string, options: Partial<TranspilerOptions> = {}): TranspilationResult {
    const mergedOptions = { ...this.options, ...options, filename }
    const cacheKey = `${filename}:${code}:${JSON.stringify(mergedOptions)}`

    if (mergedOptions.cache !== false && this.transformCache.has(cacheKey)) {
      return { ...this.transformCache.get(cacheKey)!, cached: true }
    }

    try {
      const result = Babel.transform(code, {
        filename,
        presets: [
          ["react", { runtime: "automatic" }] as any, 
          "typescript",
          ...(mergedOptions.presets || [])
        ],
        plugins: [
          // Handle import/export transformations - pass filename for context
          this.createImportTransformer(filename),
          ...(mergedOptions.plugins || [])
        ],
        sourceMaps: true,
        sourceFileName: filename
      })

      const transformed: TranspilationResult = {
        code: result.code || code,
        map: result.map,
        cached: false
      }

      if (mergedOptions.cache !== false) {
        this.transformCache.set(cacheKey, transformed)
      }

      return transformed
    } catch (error) {
      console.error("[EnhancedTranspiler] Transpilation error:", error)
      return {
        code,
        error: error as Error,
        cached: false
      }
    }
  }

  transpileJSX(code: string, filename: string, options: Partial<TranspilerOptions> = {}): TranspilationResult {
    const mergedOptions = { ...this.options, ...options, filename }
    const cacheKey = `jsx:${filename}:${code}:${JSON.stringify(mergedOptions)}`

    if (mergedOptions.cache !== false && this.transformCache.has(cacheKey)) {
      return { ...this.transformCache.get(cacheKey)!, cached: true }
    }

    try {
      const result = Babel.transform(code, {
        filename,
        presets: [
          ["react", { runtime: "automatic" }] as any,
          ...(mergedOptions.presets || [])
        ],
        plugins: mergedOptions.plugins || [],
        sourceMaps: true,
        sourceFileName: filename
      })

      console.log('[v0] Transpiled JSX for', filename)
      console.log('[v0] Output (first 500 chars):', result.code?.substring(0, 500))

      const transformed: TranspilationResult = {
        code: result.code || code,
        map: result.map,
        cached: false
      }

      if (mergedOptions.cache !== false) {
        this.transformCache.set(cacheKey, transformed)
      }

      return transformed
    } catch (error) {
      console.error("[EnhancedTranspiler] JSX transformation error:", error)
      return {
        code,
        error: error as Error,
        cached: false
      }
    }
  }

  private createImportTransformer(filename: string) {
    const self = this
    return function importTransformer() {
      return {
        visitor: {
          ImportDeclaration(path: any) {
            const source = path.node.source.value
            
            // Skip external packages
            if (!source.startsWith('./') && !source.startsWith('../') && !source.startsWith('@/')) {
              return
            }
            
            // Rewrite to absolute path that matches import map
            const resolvedPath = self.resolveImportPath(filename, source)
            if (resolvedPath) {
              console.log(`[Transpiler] Rewriting: ${filename} imports "${source}" → "${resolvedPath}"`)
              path.node.source.value = resolvedPath
            }
          },
          ExportNamedDeclaration(path: any) {
            if (path.node.source) {
              const source = path.node.source.value
              
              // Skip external packages
              if (!source.startsWith('./') && !source.startsWith('../') && !source.startsWith('@/')) {
                return
              }
              
              const resolvedPath = self.resolveImportPath(filename, source)
              if (resolvedPath) {
                console.log(`[Transpiler] Rewriting export: ${filename} exports from "${source}" → "${resolvedPath}"`)
                path.node.source.value = resolvedPath
              }
            }
          },
          ExportAllDeclaration(path: any) {
            if (path.node.source) {
              const source = path.node.source.value
              
              // Skip external packages
              if (!source.startsWith('./') && !source.startsWith('../') && !source.startsWith('@/')) {
                return
              }
              
              const resolvedPath = self.resolveImportPath(filename, source)
              if (resolvedPath) {
                console.log(`[Transpiler] Rewriting export all: ${filename} exports from "${source}" → "${resolvedPath}"`)
                path.node.source.value = resolvedPath
              }
            }
          }
        }
      }
    }
  }
  
  private resolveImportPath(fromFile: string, importPath: string): string | null {
    // Normalize fromFile - remove leading slash for consistent resolution
    const normalizedFromFile = fromFile.startsWith('/') ? fromFile.substring(1) : fromFile
    
    // Handle @/ alias
    if (importPath.startsWith('@/')) {
      // Convert @/components/Button → /src/components/Button (with leading slash)
      return ('/src/' + importPath.substring(2)).replace(/\.(tsx|ts|jsx|js)$/, '')
    }
    
    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      // Calculate absolute path from relative import
      const fromDir = normalizedFromFile.split('/').slice(0, -1)
      const importParts = importPath.split('/')
      
      let currentPath = [...fromDir]
      for (const part of importParts) {
        if (part === '..') {
          currentPath.pop()
        } else if (part !== '.') {
          currentPath.push(part)
        }
      }
      
      // Return absolute path with leading slash and without extension
      return '/' + currentPath.join('/').replace(/\.(tsx|ts|jsx|js)$/, '')
    }
    
    return null
  }

  // Track dependencies for cache invalidation
  trackDependencies(filename: string, dependencies: string[]): void {
    this.dependencyGraph.set(filename, new Set(dependencies))
  }

  // Invalidate cache entries that depend on changed files
  invalidateCache(changedFiles: string[]): void {
    const toInvalidate = new Set<string>()
    
    // Find all entries that depend on changed files
    for (const [file, deps] of this.dependencyGraph) {
      for (const changedFile of changedFiles) {
        if (deps.has(changedFile)) {
          toInvalidate.add(file)
        }
      }
    }
    
    // Invalidate cache entries
    for (const file of toInvalidate) {
      for (const [key] of this.transformCache) {
        if (key.startsWith(`${file}:`)) {
          this.transformCache.delete(key)
        }
      }
    }
  }

  // Clear all cache
  clearCache(): void {
    this.transformCache.clear()
    this.dependencyGraph.clear()
  }

  invalidateFile(filename: string): void {
    // Invalidate cache entries for this file
    for (const key of this.transformCache.keys()) {
      if (key.startsWith(filename)) {
        this.transformCache.delete(key)
        console.log('[Transpiler] Invalidated cache for', filename)
      }
    }
    
    // Invalidate dependents
    const dependents = this.dependencyGraph.get(filename)
    if (dependents) {
      for (const dependent of dependents) {
        this.invalidateFile(dependent)
      }
    }
  }

  // Get cache statistics
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.transformCache.size,
      hitRate: 0 // Could be implemented with usage tracking
    }
  }

  // Extract dependencies from code for tracking
  extractDependencies(code: string): string[] {
    const dependencies: string[] = []
    
    try {
      // Simple regex-based dependency extraction for browser compatibility
      // Import statements: import ... from 'module'
      const importRegex = /import\s+(?:[\w\s{},*]*\s+from\s+)?['"]([^'"]+)['"]/g
      let match
      
      while ((match = importRegex.exec(code)) !== null) {
        dependencies.push(match[1])
      }
      
      // Export statements: export ... from 'module'
      const exportRegex = /export\s+(?:[\w\s{},*]*\s+from\s+)?['"]([^'"]+)['"]/g
      
      while ((match = exportRegex.exec(code)) !== null) {
        dependencies.push(match[1])
      }
      
      // Dynamic imports: import('module')
      const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
      
      while ((match = dynamicImportRegex.exec(code)) !== null) {
        dependencies.push(match[1])
      }
      
      // Require statements: require('module')
      const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
      
      while ((match = requireRegex.exec(code)) !== null) {
        dependencies.push(match[1])
      }
    } catch (error) {
      console.warn('[EnhancedTranspiler] Failed to extract dependencies:', error)
    }
    
    return [...new Set(dependencies)] // Remove duplicates
  }

  // Validate transpiled code
  validateTranspiledCode(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    try {
      // Basic syntax check
      new Function(code)
    } catch (error: any) {
      errors.push(`Syntax error: ${error.message}`)
    }
    
    // Check for common issues
    if (code.includes('undefined') && code.includes('import')) {
      errors.push('Possible import resolution issue detected')
    }
    
    if (code.includes('require(') && !code.includes('module.exports')) {
      errors.push('CommonJS require() detected in ES module')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}
