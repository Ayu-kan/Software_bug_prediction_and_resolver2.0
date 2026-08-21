import React from 'react';
import { DiffEditor } from '@monaco-editor/react';

interface CodeDiffViewProps {
  originalCode: string;
  modifiedCode: string;
  language?: string;
  height?: string;
}

const CodeDiffView: React.FC<CodeDiffViewProps> = ({
  originalCode,
  modifiedCode,
  language = 'javascript',
  height = '100%'
}) => {
  return (
    <div className="w-full h-full border border-border rounded-lg overflow-hidden bg-[#1e1e1e]">
      <div className="flex justify-between items-center px-4 py-2 bg-secondary/40 border-b border-border/50 text-xs font-semibold text-muted-foreground">
        <span>Original Source File</span>
        <span>AI Fixed / Refactored Solution</span>
      </div>
      <div className="h-[calc(100%-33px)]">
        <DiffEditor
          height={height}
          language={language}
          theme="vs-dark"
          original={originalCode || '// Original code unavailable'}
          modified={modifiedCode || '// Refactored patch unavailable'}
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            padding: { top: 12 }
          }}
        />
      </div>
    </div>
  );
};

export default CodeDiffView;
