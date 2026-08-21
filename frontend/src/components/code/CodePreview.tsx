import React from 'react';
import { motion } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { X } from 'lucide-react';

interface CodePreviewProps {
  file: any;
  onClose: () => void;
}

const CodePreview: React.FC<CodePreviewProps> = ({ file, onClose }) => {
  if (!file) return null;

  // Attempt to determine language from extension
  const ext = file.file.split('.').pop();
  let language = 'javascript';
  if (ext === 'py') language = 'python';
  else if (ext === 'ts' || ext === 'tsx') language = 'typescript';
  else if (ext === 'java') language = 'java';
  else if (ext === 'cpp' || ext === 'h') language = 'cpp';

  // Highlight suspicious lines using Editor's mount features
  const handleEditorDidMount = (editor: any, monaco: any) => {
    if (file.suspicious_lines && file.suspicious_lines.length > 0) {
      const decorations = file.suspicious_lines.map((sl: any) => ({
        range: new monaco.Range(sl.line_number, 1, sl.line_number, 1),
        options: {
          isWholeLine: true,
          className: 'bg-destructive/20',
          glyphMarginClassName: 'bg-destructive rounded-full w-2 h-2 ml-1 mt-1',
          hoverMessage: { value: `**Suspicious Line Detected**\n${sl.issue}` }
        }
      }));
      editor.deltaDecorations([], decorations);
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full max-w-3xl glass z-50 shadow-2xl flex flex-col border-l border-border"
    >
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div>
          <h3 className="font-semibold">{file.file.split(/[/\\]/).pop()}</h3>
          <p className="text-xs text-muted-foreground">{file.file}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-2 border-b border-border/30 bg-secondary/20 flex space-x-4 text-sm">
        <span className="text-muted-foreground">ML Probability: <span className="font-mono text-foreground">{(file.ml_probability * 100).toFixed(1)}%</span></span>
        <span className="text-muted-foreground">Suspicious Lines: <span className="font-mono text-destructive">{file.suspicious_count}</span></span>
      </div>

      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark" // Deep dark theme matches well
          value={file.last_source_code || '// Source code not available'}
          options={{
            readOnly: true,
            minimap: { enabled: true },
            fontSize: 14,
            glyphMargin: true,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            padding: { top: 16 }
          }}
          onMount={handleEditorDidMount}
        />
      </div>
    </motion.div>
  );
};

export default CodePreview;
