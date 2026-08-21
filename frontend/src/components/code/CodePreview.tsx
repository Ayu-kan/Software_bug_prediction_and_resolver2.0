import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { X, AlertTriangle, Sparkles, ChevronRight, ShieldAlert, FileCode, Info, ExternalLink, Loader2, Lock } from 'lucide-react';
import { analysisAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface CodePreviewProps {
  file: any;
  targetLineNumber?: number | null;
  onClose: () => void;
  onResolve?: (file: any) => void;
}

const CodePreview: React.FC<CodePreviewProps> = ({ file, targetLineNumber, onClose, onResolve }) => {
  const [sourceCode, setSourceCode] = useState<string>(file?.last_source_code || '');
  const [loading, setLoading] = useState<boolean>(!file?.last_source_code);
  const [selectedBugIndex, setSelectedBugIndex] = useState<number>(0);
  const [showBugDrawer, setShowBugDrawer] = useState<boolean>(true);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const { getActiveApiKey } = useAuthStore();
  const hasApiKey = Boolean(getActiveApiKey());

  if (!file) return null;

  // Determine language from file extension
  const ext = file.file.split('.').pop()?.toLowerCase();
  let language = 'javascript';
  if (ext === 'py') language = 'python';
  else if (ext === 'ts' || ext === 'tsx') language = 'typescript';
  else if (ext === 'java') language = 'java';
  else if (ext === 'cpp' || ext === 'h' || ext === 'c') language = 'cpp';

  // Load full file content from backend if source code is empty
  useEffect(() => {
    if (!sourceCode && file.file) {
      setLoading(true);
      analysisAPI.getFileContent(file.file, file.repo_path)
        .then((res) => {
          if (res.success && res.content) {
            setSourceCode(res.content);
          } else {
            setSourceCode('// Unable to load file content from path: ' + file.file);
          }
        })
        .catch(() => {
          setSourceCode('// Error fetching source file.');
        })
        .finally(() => setLoading(false));
    }
  }, [file]);

  // Jump to targeted line when editor mounts or target line changes
  const jumpToLine = (lineNum: number) => {
    if (editorRef.current && lineNum > 0) {
      editorRef.current.revealLineInCenter(lineNum);
      editorRef.current.setPosition({ lineNumber: lineNum, column: 1 });
      editorRef.current.focus();
    }
  };

  useEffect(() => {
    if (targetLineNumber && editorRef.current) {
      jumpToLine(targetLineNumber);
    }
  }, [targetLineNumber]);

  // Monaco editor mount handler
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    if (file.suspicious_lines && file.suspicious_lines.length > 0) {
      const decorations = file.suspicious_lines.map((sl: any, index: number) => ({
        range: new monaco.Range(sl.line_number, 1, sl.line_number, 1),
        options: {
          isWholeLine: true,
          className: 'bg-red-500/25 border-l-4 border-red-500 font-semibold',
          glyphMarginClassName: 'bg-red-500 rounded-full w-2.5 h-2.5 ml-1 mt-1 shadow-sm shadow-red-500',
          hoverMessage: { value: `**[HIGH RISK BUG] Line ${sl.line_number}**\n\n${sl.issue || sl.reason || 'Potential defect detected.'}` }
        }
      }));
      editor.deltaDecorations([], decorations);
    }

    if (targetLineNumber) {
      setTimeout(() => jumpToLine(targetLineNumber), 200);
    }
  };

  const suspiciousLines = file.suspicious_lines || [];
  const currentBug = suspiciousLines[selectedBugIndex] || null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full max-w-5xl glass z-50 shadow-2xl flex flex-col border-l border-border bg-background/95 backdrop-blur-xl"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-secondary/30">
        <div className="flex items-center space-x-3 truncate">
          <div className="p-2 bg-primary/10 rounded-lg text-primary border border-primary/20">
            <FileCode size={20} />
          </div>
          <div className="truncate">
            <h3 className="font-bold text-lg leading-none truncate">{file.file.split(/[/\\]/).pop()}</h3>
            <p className="text-xs text-muted-foreground mt-1 font-mono truncate">{file.file}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onResolve && (
            <button
              onClick={() => hasApiKey && onResolve(file)}
              disabled={!hasApiKey}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-md transition-all ${
                hasApiKey
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-900/20'
                  : 'bg-secondary/60 text-muted-foreground cursor-not-allowed opacity-60 border border-border'
              }`}
              title={hasApiKey ? 'Generate AI Auto-Fix' : 'API key required — configure in Settings'}
            >
              {hasApiKey ? <Sparkles size={14} /> : <Lock size={14} />}
              <span>AI Resolution</span>
            </button>
          )}
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Stats sub-bar */}
      <div className="px-4 py-2 bg-secondary/20 border-b border-border/30 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-4">
          <span className="text-muted-foreground">
            Risk: <span className="font-bold text-foreground">{(file.ml_probability * 100).toFixed(1)}%</span>
          </span>
          <span className="text-muted-foreground">
            Complexity: <span className="text-foreground">{file.complexity || 'N/A'}</span>
          </span>
          <span className="text-muted-foreground">
            Bugs Detected: <span className="font-bold text-red-400">{suspiciousLines.length}</span>
          </span>
        </div>

        <button
          onClick={() => setShowBugDrawer(!showBugDrawer)}
          className="text-xs text-primary hover:underline flex items-center space-x-1"
        >
          <Info size={14} />
          <span>{showBugDrawer ? 'Hide Bug Details' : 'Show Bug Details'}</span>
        </button>
      </div>

      {/* Main Content Layout (Editor + Bug Drawer) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Editor Area */}
        <div className="flex-1 relative h-full">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3">
              <Loader2 className="animate-spin text-primary" size={36} />
              <p className="text-sm text-muted-foreground">Loading complete source file...</p>
            </div>
          ) : (
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={sourceCode}
              options={{
                readOnly: true,
                minimap: { enabled: true },
                fontSize: 13,
                glyphMargin: true,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                padding: { top: 12 }
              }}
              onMount={handleEditorDidMount}
            />
          )}
        </div>

        {/* Interactive Bug Details Side Drawer */}
        {showBugDrawer && suspiciousLines.length > 0 && (
          <div className="w-80 border-l border-border bg-secondary/20 flex flex-col overflow-y-auto p-4 space-y-4">
            <div className="flex items-center space-x-2 text-red-400 font-bold text-sm border-b border-border/50 pb-2">
              <ShieldAlert size={18} />
              <span>Detected Code Issues ({suspiciousLines.length})</span>
            </div>

            {/* List of Suspicious Bugs */}
            <div className="space-y-2">
              {suspiciousLines.map((sl: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedBugIndex(idx);
                    jumpToLine(sl.line_number);
                  }}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    selectedBugIndex === idx
                      ? 'bg-red-500/15 border-red-500/50 text-foreground shadow-sm'
                      : 'bg-secondary/40 border-border/60 hover:bg-secondary/80 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="text-red-400 font-mono">Line {sl.line_number}</span>
                    <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px]">High</span>
                  </div>
                  <p className="line-clamp-2 leading-relaxed font-sans">{sl.issue || sl.reason || 'Code anomaly'}</p>
                </div>
              ))}
            </div>

            {/* Active Selected Bug Detailed Breakdown */}
            {currentBug && (
              <div className="mt-4 p-4 rounded-xl border border-border bg-background/80 space-y-3 text-xs">
                <h4 className="font-bold text-foreground flex items-center space-x-1.5">
                  <AlertTriangle size={14} className="text-red-400" />
                  <span>Issue Breakdown</span>
                </h4>
                
                <div>
                  <span className="text-muted-foreground font-medium">Target Line:</span>
                  <p className="font-mono text-red-400 font-bold mt-0.5">Line {currentBug.line_number}</p>
                </div>

                <div>
                  <span className="text-muted-foreground font-medium">Explanation:</span>
                  <p className="mt-0.5 text-foreground leading-relaxed">{currentBug.issue || currentBug.reason}</p>
                </div>

                <div>
                  <span className="text-muted-foreground font-medium">Potential Risk:</span>
                  <p className="mt-0.5 text-muted-foreground">High cyclomatic vulnerability or unhandled state fault.</p>
                </div>

                {onResolve && (
                  <button
                    onClick={() => hasApiKey && onResolve(file)}
                    disabled={!hasApiKey}
                    className={`w-full mt-2 py-2 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-sm ${
                      hasApiKey
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-secondary/60 text-muted-foreground cursor-not-allowed opacity-60 border border-border'
                    }`}
                    title={hasApiKey ? 'Generate AI fix' : 'API key required — configure in Settings'}
                  >
                    {hasApiKey ? <Sparkles size={14} /> : <Lock size={14} />}
                    <span>{hasApiKey ? 'Generate Fix for this Line' : 'API Key Required'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </motion.div>
  );
};

export default CodePreview;
