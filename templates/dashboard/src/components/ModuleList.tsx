import { useState } from 'react';
import { VirtualFS, DEFAULT_PROJECT_FILES } from '@jxrstudios/jxr';

export function ModuleList() {
  const [vfs] = useState(() => new VirtualFS(DEFAULT_PROJECT_FILES));
  const files = vfs.list();

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#9ca3af' }}>VirtualFS Modules</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {files.map((file) => (
          <div
            key={file.path}
            style={{
              background: '#111',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ color: '#ea580c', fontFamily: 'monospace', fontSize: '0.85rem' }}>{file.path}</span>
              <span style={{
                marginLeft: '0.75rem',
                fontSize: '0.7rem',
                padding: '0.15rem 0.5rem',
                background: 'rgba(234,88,12,0.12)',
                border: '1px solid rgba(234,88,12,0.25)',
                borderRadius: '100px',
                color: '#f97316',
                fontFamily: 'monospace',
              }}>
                {file.language}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#4b5563', fontFamily: 'monospace' }}>
              {file.size} B
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
