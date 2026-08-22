import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Editor from '@monaco-editor/react';
import {
  X, AlertTriangle, Sparkles, ShieldAlert, FileCode,
  Info, Loader2, Lock, ShieldCheck
} from 'lucide-react';
import { analysisAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface CodePreviewProps {
  file: any;
  targetLineNumber?: number | null;
  onClose: () => void;
  onResolve?: (file: any) => void;
}

const getLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py': return 'python';
    case 'js': case 'jsx': return 'javascript';
    case 'ts': case 'tsx': return 'typescript';
    case 'java': return 'java';
    case 'cpp': case 'cc': case 'cxx': case 'c': case 'h': case 'hpp': return 'cpp';
    case 'cs': return 'csharp';
    case 'go': return 'go';
    case 'rs': return 'rust';
    case 'html': case 'htm': return 'html';
    case 'css': case 'scss': case 'less': return 'css';
    case 'json': return 'json';
    case 'md': case 'markdown': return 'markdown';
    case 'yaml': case 'yml': return 'yaml';
    case 'sql': return 'sql';
    case 'sh': case 'bash': case 'ps1': return 'shell';
    case 'xml': return 'xml';
    default: return 'plaintext';
  }
};

const CodePreview: React.FC<CodePreviewProps> = ({ file, targetLineNumber, onClose, onResolve }) => {
  const [sourceCode, setSourceCode] = useState<string>(file?.last_source_code || '');
  const [loading, setLoading] = useState<boolean>(!file?.last_source_code);
  const [selectedBugIndex, setSelectedBugIndex] = useState<number>(0);
  const [showBugDrawer, setShowBugDrawer] = useState<boolean>(true);
  
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  
  const { getActiveApiKey, getCurrentRole } = useAuthStore();
  const hasApiKey = Boolean(getActiveApiKey());
  const userRole = getCurrentRole();
  const canResolve = hasApiKey && userRole !== 'viewer';

  if (!file) return null;

  const language = getLanguageFromPath(file.file || '');
  const suspiciousLines = Array.isArray(file.suspicious_lines) ? file.suspicious_lines : [];
  const hasIssues = suspiciousLines.length > 0;
  const currentBug = hasIssues ? suspiciousLines[selectedBugIndex] : null;

  // Load full file content from backend if source code is empty
  useEffect(() => {
    if (!sourceCode && file.file) {
      setLoading(true);
      analysisAPI.getFileContent(file.file, file.repo_path)
        .then((res) => {
          if (res.success && res.content) {
            setSourceCode(res.content);
          } else {
            setSourceCode('// Unable to load file content from path: ' + file.file + '\n// Error: ' + (res.error || 'File not accessible.'));
          }
        })
        .catch(() => {
          setSourceCode('// Error fetching source file from server.');
        })
        .finally(() => setLoading(false));
    }
  }, [file]);

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

    if (hasIssues) {
      const decorations = suspiciousLines.map((sl: any) => ({
        range: new monaco.Range(sl.line_number, 1, sl.line_number, 1),
        options: {
          isWholeLine: true,
          className: 'bg-red-500/20 border-l-4 border-red-500 font-semibold',
          glyphMarginClassName: 'bg-red-500 rounded-full w-2.5 h-2.5 ml-1 mt-1 shadow-sm shadow-red-500',
          hoverMessage: {
            value: `**[DEFECT DETECTED] Line ${sl.line_number}**\n\n${sl.reason || sl.issue || 'Potential bug trigger.'}\n\n*Severity: ${sl.severity || 'Medium'}*`
          }
        }
      }));
      decorationsRef.current = editor.deltaDecorations([], decorations);
    } else {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    }

    if (targetLineNumber) {
      setTimeout(() => jumpToLine(targetLineNumber), 150);
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 26, stiffness: 220 }}
      className="fixed inset-y-0 right-0 w-full max-w-5xl glass z-50 shadow-2xl flex flex-col border-l border-border bg-background/95 backdrop-blur-xl"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-secondary/30">
        <div className="flex items-center space-x-3 truncate">
          <div className={`p-2 rounded-lg border shadow-sm ${
            hasIssues ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-green-500/10 text-green-400 border-green-500/20'
          }`}>
            <FileCode size={20} />
          </div>
          <div className="truncate">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-base leading-none truncate">{file.file.split(/[/\\]/).pop()}</h3>
              {!hasIssues && (
                <span className="px-2 py-0.5 rounded bg-green-500/15 text-green-400 text-[10px] font-semibold flex items-center space-x-1 border border-green-500/20">
                  <ShieldCheck size={12} />
                  <span>Clean File (0 Issues)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono truncate">{file.file}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onResolve && (
            <button
              onClick={() => canResolve && onResolve(file)}
              disabled={!canResolve}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-md transition-all ${
                canResolve
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-900/20 cursor-pointer'
                  : 'bg-secondary/60 text-muted-foreground cursor-not-allowed opacity-60 border border-border'
              }`}
              title={
                !hasApiKey
                  ? 'API key required — configure in Settings'
                  : userRole === 'viewer'
                  ? 'Viewer role has read-only access'
                  : 'Generate AI Auto-Fix'
              }
            >
              {canResolve ? <Sparkles size={14} /> : <Lock size={14} />}
              <span>AI Resolution</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Stats Sub-Bar */}
      <div className="px-4 py-2 bg-secondary/20 border-b border-border/30 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-4">
          <span className="text-muted-foreground">
            Risk: <span className="font-bold text-foreground">{(file.ml_probability * 100).toFixed(1)}%</span>
          </span>
          <span className="text-muted-foreground">
            Complexity: <span className="text-foreground">{file.complexity || 'N/A'}</span>
          </span>
          <span className="text-muted-foreground">
            Language: <span className="text-foreground capitalize">{language}</span>
          </span>
          <span className="text-muted-foreground">
            Flagged Lines:{' '}
            <span className={`font-bold ${hasIssues ? 'text-destructive' : 'text-green-400'}`}>
              {suspiciousLines.length}
            </span>
          </span>
        </div>

        {hasIssues && (
          <button
            onClick={() => setShowBugDrawer(!showBugDrawer)}
            className="text-xs text-primary hover:underline flex items-center space-x-1 font-sans"
          >
            <Info size={14} />
            <span>{showBugDrawer ? 'Hide Issue Details' : 'Show Issue Details'}</span>
          </button>
        )}
      </div>

      {/* Main Content Layout (Monaco Editor + Optional Bug Drawer) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Editor Area */}
        <div className="flex-1 relative h-full">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3">
              <Loader2 className="animate-spin text-primary" size={36} />
              <p className="text-xs text-muted-foreground">Loading complete source code...</p>
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
                glyphMargin: hasIssues,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                padding: { top: 12 },
                lineNumbers: 'on',
                automaticLayout: true,
              }}
              onMount={handleEditorDidMount}
            />
          )}
        </div>

        {/* Bug Details Side Drawer */}
        {hasIssues && showBugDrawer && (
          <div className="w-80 border-l border-border bg-secondary/20 flex flex-col overflow-y-auto p-4 space-y-4">
            <div className="flex items-center space-x-2 text-destructive font-bold text-xs border-b border-border/50 pb-2">
              <ShieldAlert size={16} />
              <span>Flagged Code Defect Lines ({suspiciousLines.length})</span>
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
                      ? 'bg-destructive/15 border-destructive/50 text-foreground shadow-sm'
                      : 'bg-secondary/40 border-border/60 hover:bg-secondary/80 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="text-destructive font-mono">Line {sl.line_number}</span>
                    <span className="px-1.5 py-0.5 rounded bg-destructive/20 text-destructive text-[10px]">
                      {sl.severity || 'High'}
                    </span>
                  </div>
                  <p className="line-clamp-2 leading-relaxed font-sans">{sl.reason || sl.issue || 'Suspicious syntax pattern'}</p>
                </div>
              ))}
            </div>

            {/* Active Selected Bug Breakdown */}
            {currentBug && (
              <div className="mt-4 p-4 rounded-xl border border-border bg-background/90 space-y-3 text-xs">
                <h4 className="font-bold text-foreground flex items-center space-x-1.5">
                  <AlertTriangle size={14} className="text-yellow-400" />
                  <span>Issue Breakdown</span>
                </h4>
                
                <div>
                  <span className="text-muted-foreground font-medium">Target Line:</span>
                  <p className="font-mono text-destructive font-bold mt-0.5">Line {currentBug.line_number}</p>
                </div>

                <div>
                  <span className="text-muted-foreground font-medium">Explanation:</span>
                  <p className="mt-0.5 text-foreground leading-relaxed">{currentBug.reason || currentBug.issue}</p>
                </div>

                <div>
                  <span className="text-muted-foreground font-medium">Risk Category:</span>
                  <p className="mt-0.5 text-muted-foreground">{currentBug.risk_type || 'Potential Logic Fault'}</p>
                </div>

                {onResolve && (
                  <button
                    onClick={() => canResolve && onResolve(file)}
                    disabled={!canResolve}
                    className={`w-full mt-2 py-2 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-sm text-xs ${
                      canResolve
                        ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
                        : 'bg-secondary/60 text-muted-foreground cursor-not-allowed opacity-60 border border-border'
                    }`}
                  >
                    {canResolve ? <Sparkles size={14} /> : <Lock size={14} />}
                    <span>{canResolve ? 'Generate Fix for this File' : 'API Key Required'}</span>
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
