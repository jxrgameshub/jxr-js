/**
 * Entry point detection utility for the preview system
 * Automatically finds or creates appropriate entry points for preview rendering
 */

export interface ProjectFile {
  id: string
  path: string
  content: string
  language: string
  createdAt: number
  updatedAt: number
}

export interface EntryPointDetection {
  entryPoint: string
  files: ProjectFile[]
  createdEntry: boolean
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Ordered: prefer component files over bootstrap files.
// The preview engine already handles React mounting — it needs a *component* entry,
// not a bootstrap file that calls createRoot() itself.
const COMMON_ENTRY_POINTS = [
  'src/App.tsx',
  'src/App.ts',
  'App.tsx',
  'App.ts',
  'app/page.tsx', // Next.js
  'app/page.ts',
  'src/main.tsx',
  'src/main.ts',
  'main.tsx',
  'main.ts',
  'index.tsx',
  'index.ts',
  'src/index.tsx',
  'src/index.ts'
]

const COMPONENT_INDICATORS = [
  'App',
  'Main',
  'Page',
  'Index',
  'Home'
]

/**
 * Finds or creates an entry point for preview rendering
 */
export function findOrCreateEntryPoint(files: ProjectFile[]): EntryPointDetection {
  console.log('🔍 Entry point detection: Starting with', files.length, 'files')
  console.log('📁 Available files:', files.map(f => f.path))

  // Try to find existing entry point
  const existingEntry = findExistingEntryPoint(files)
  if (existingEntry) {
    console.log('🎯 Found existing entry point:', existingEntry)
    return {
      entryPoint: existingEntry,
      files,
      createdEntry: false
    }
  }

  // Try to find a component that could serve as entry point
  const componentEntry = findComponentEntryPoint(files)
  if (componentEntry) {
    console.log('🔧 Found component that could be entry point:', componentEntry)
    
    // Create an app wrapper for the component
    const componentFile = files.find(f => f.path === componentEntry)
    if (componentFile) {
      console.log('📝 Creating app wrapper for component:', componentEntry)
      const appWrapperFile = createAppWrapperForComponent(componentFile)
      const updatedFiles = [...files, appWrapperFile]
      
      return {
        entryPoint: appWrapperFile.path,
        files: updatedFiles,
        createdEntry: true
      }
    }
  }

  // Create a default entry point
  console.log('📝 Creating default entry point')
  const entryPointFile = createDefaultEntryPoint(files)
  const updatedFiles = [...files, entryPointFile]

  return {
    entryPoint: entryPointFile.path,
    files: updatedFiles,
    createdEntry: true
  }
}

/**
 * Detects whether a file is a bootstrap/mount file (calls createRoot, render, hydrateRoot)
 * rather than a renderable component. The preview engine handles mounting itself,
 * so these files should be skipped as entry points.
 */
function isBootstrapFile(file: ProjectFile): boolean {
  const c = file.content
  return (
    /\bcreateRoot\s*\(/.test(c) ||
    /ReactDOM\.render\s*\(/.test(c) ||
    /\bhydrateRoot\s*\(/.test(c)
  )
}

/**
 * Given a bootstrap file like `src/main.tsx`, extract the component it imports.
 * e.g. `import App from './App'` → resolve to `src/App.tsx`.
 * Returns null if no component import is found.
 */
function extractComponentFromBootstrap(bootstrapFile: ProjectFile, allFiles: ProjectFile[]): string | null {
  // Match default imports: import Foo from './path'
  const importRe = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g
  let match: RegExpExecArray | null
  while ((match = importRe.exec(bootstrapFile.content)) !== null) {
    const importPath = match[2]
    // Skip external packages
    if (!importPath.startsWith('.') && !importPath.startsWith('@/')) continue
    // Resolve relative to the bootstrap file's directory
    const bootstrapDir = bootstrapFile.path.replace(/\/[^/]+$/, '')
    let resolvedBase: string
    if (importPath.startsWith('@/')) {
      resolvedBase = 'src/' + importPath.slice(2)
    } else {
      // Resolve relative import
      const parts = bootstrapDir.split('/').filter(Boolean)
      for (const seg of importPath.split('/')) {
        if (seg === '..') parts.pop()
        else if (seg !== '.') parts.push(seg)
      }
      resolvedBase = parts.join('/')
    }
    // Try to find the file with extensions
    const extensions = ['.tsx', '.ts', '.jsx', '.js', '']
    for (const ext of extensions) {
      const candidate = resolvedBase + ext
      const found = allFiles.find(f =>
        f.path === candidate ||
        f.path === '/' + candidate ||
        f.path.replace(/^\//, '') === candidate
      )
      if (found) {
        console.log(`🔗 Bootstrap ${bootstrapFile.path} imports component from ${found.path}`)
        return found.path
      }
    }
  }
  return null
}

/**
 * Searches for existing entry points in the file list.
 * Skips bootstrap files and resolves to the component they import instead.
 */
function findExistingEntryPoint(files: ProjectFile[]): string | null {
  for (const entryPath of COMMON_ENTRY_POINTS) {
    const found = files.find(f => 
      f.path === entryPath || 
      f.path.endsWith(entryPath) ||
      f.path.replace(/^\//, '') === entryPath.replace(/^\//, '')
    )
    if (found) {
      // If this is a bootstrap file (calls createRoot/render), skip it
      // and try to resolve the component it imports instead
      if (isBootstrapFile(found)) {
        console.log(`⚡ Skipping bootstrap file as entry point: ${found.path}`)
        const componentPath = extractComponentFromBootstrap(found, files)
        if (componentPath) {
          return componentPath
        }
        // If we can't extract a component, continue searching
        continue
      }
      return found.path
    }
  }
  return null
}

/**
 * Finds a component that could serve as entry point
 */
function findComponentEntryPoint(files: ProjectFile[]): string | null {
  // Look for files with component indicators
  for (const file of files) {
    const fileName = file.path.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '')
    if (fileName && COMPONENT_INDICATORS.includes(fileName)) {
      return file.path
    }
  }

  // Look for the first React component (contains JSX/TSX)
  const jsxFiles = files.filter(f => 
    f.path.endsWith('.tsx') || f.path.endsWith('.jsx')
  )
  
  if (jsxFiles.length > 0) {
    // Prefer files with "export default" or component patterns
    for (const file of jsxFiles) {
      if (file.content.includes('export default') || 
          file.content.includes('function') ||
          file.content.includes('const')) {
        return file.path
      }
    }
    // Fallback to first JSX file
    return jsxFiles[0].path
  }

  // Look for TypeScript files
  const tsFiles = files.filter(f => f.path.endsWith('.ts'))
  if (tsFiles.length > 0) {
    return tsFiles[0].path
  }

  return null
}

/**
 * Converts a string to a valid PascalCase JavaScript identifier
 * e.g., "html-landing" → "HtmlLanding", "my-component" → "MyComponent"
 */
function toValidIdentifier(name: string): string {
  // Replace hyphens and underscores with spaces, then convert to PascalCase
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
    // Remove any remaining invalid characters
    .replace(/[^a-zA-Z0-9_$]/g, '')
    // Ensure it starts with a letter or underscore (prepend underscore if it starts with a number)
    .replace(/^[0-9]/, '_$&')
    || 'Component' // fallback if empty
}

/**
 * Creates an app wrapper for a component file
 */
function createAppWrapperForComponent(componentFile: ProjectFile): ProjectFile {
  const rawComponentName = componentFile.path.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || 'Component'
  const componentName = toValidIdentifier(rawComponentName)
  const componentPath = componentFile.path.replace(/\.(tsx?|jsx?)$/, '')
  
  const content = `import React from 'react'
import ${componentName} from '${componentPath}'

// App wrapper created by preview system for component: ${componentName}
export default function App() {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'system-ui, sans-serif',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          color: '#333',
          marginBottom: '10px',
          fontSize: '28px',
          fontWeight: '700'
        }}>
          DamascusAI Preview
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '30px',
          fontSize: '16px'
        }}>
          Sovereign generation system active - Component: ${componentName}
        </p>
        
        <div style={{
          border: '2px dashed #e2e8f0',
          borderRadius: '8px',
          padding: '20px',
          background: '#f8fafc'
        }}>
          <h2 style={{
            color: '#4a5568',
            marginBottom: '15px',
            fontSize: '18px'
          }}>
            Component: <code>${componentName}</code>
          </h2>
          <${componentName} />
        </div>
        
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#edf2f7',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#4a5568'
        }}>
          <strong>Generated by:</strong> DamascusAI Sovereign Stack
        </div>
      </div>
    </div>
  )
}
`

  const now = Date.now()
  return {
    id: generateId(),
    path: '/App.tsx',
    content,
    language: 'typescript',
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Creates a default entry point that imports and renders available components
 */
function createDefaultEntryPoint(files: ProjectFile[]): ProjectFile {
  console.log('📝 Creating default App.tsx entry point')

  // Find components to import
  const components = findAvailableComponents(files)
  
  // Sanitize component names to be valid JavaScript identifiers
  const sanitizedComponents = components.map(comp => ({
    ...comp,
    name: toValidIdentifier(comp.name)
  }))
  
  const imports = sanitizedComponents.map(comp => 
    `import ${comp.name} from '${comp.path.replace(/\.(tsx?|jsx?)$/, '')}'`
  ).join('\n')

  const componentUsage = sanitizedComponents.map(comp => 
    `      <${comp.name} />`
  ).join('\n')

  const content = `${imports}
import React from 'react'

// Default entry point created by preview system
export default function App() {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'system-ui, sans-serif',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          color: '#333',
          marginBottom: '10px',
          fontSize: '28px',
          fontWeight: '700'
        }}>
          🚀 Damascus AI Preview
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '30px',
          fontSize: '16px'
        }}>
          Sovereign generation system active
        </p>
        
        <div style={{
          border: '2px dashed #e2e8f0',
          borderRadius: '8px',
          padding: '20px',
          background: '#f8fafc'
        }}>
          <h2 style={{
            color: '#4a5568',
            marginBottom: '15px',
            fontSize: '18px'
          }}>
            Generated Components:
          </h2>
          <div style={{ marginTop: '20px' }}>
${componentUsage}
          </div>
        </div>
        
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#edf2f7',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#4a5568'
        }}>
          <strong>Generated by:</strong> DamascusAI Sovereign Stack
        </div>
      </div>
    </div>
  )
}
`

  const now = Date.now()
  return {
    id: generateId(),
    path: '/App.tsx',
    content,
    language: 'typescript',
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Finds available components in the file list
 */
function findAvailableComponents(files: ProjectFile[]): Array<{name: string, path: string}> {
  const components: Array<{name: string, path: string}> = []

  for (const file of files) {
    if (file.path.endsWith('.tsx') || file.path.endsWith('.jsx')) {
      const fileName = file.path.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '')
      if (fileName && fileName !== 'App' && fileName !== 'index') {
        // Check if it's likely a component (has JSX or export)
        if (file.content.includes('export') || file.content.includes('return')) {
          components.push({
            name: fileName,
            path: file.path
          })
        }
      }
    }
  }

  // If no components found, create a simple placeholder
  if (components.length === 0) {
    components.push({
      name: 'GeneratedContent',
      path: '/placeholder'
    })
  }

  return components.slice(0, 3) // Limit to first 3 components
}
