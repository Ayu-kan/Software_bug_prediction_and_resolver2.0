import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, AlertTriangle, Code2, Sparkles, ExternalLink } from 'lucide-react';

interface RiskTableProps {
  files: any[];
  onPreview: (file: any, lineNumber?: number) => void;
  onResolve: (file: any) => void;
}

const RiskTable: React.FC<RiskTableProps> = ({ files, onPreview, onResolve }) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const toggleRow = (path: string) => {
    setExpandedRows(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const getRiskBadge = (prob: number) => {
    if (prob >= 0.7) return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-destructive/15 text-destructive border border-destructive/20">High</span>;
    if (prob >= 0.4) return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">Medium</span>;
    return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-500/15 text-green-400 border border-green-500/20">Low</span>;
  };

  const filteredFiles = files.filter(f => f.file.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder="Search file path..."
          className="w-72 bg-secondary/40 border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">Displaying {filteredFiles.length} files</span>
      </div>

      <div className="border border-border rounded-xl overflow-hidden glass shadow-lg">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/40 border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 font-semibold w-10"></th>
              <th className="px-4 py-3 font-semibold w-16">Rank</th>
              <th className="px-4 py-3 font-semibold">File Path</th>
              <th className="px-4 py-3 font-semibold">Risk Level</th>
              <th className="px-4 py-3 font-semibold">ML Prob</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filteredFiles.map((file, idx) => (
              <React.Fragment key={file.file}>
                <tr className="hover:bg-secondary/20 transition-colors group">
                  <td className="px-4 py-3 text-center cursor-pointer text-muted-foreground" onClick={() => toggleRow(file.file)}>
                    {expandedRows[file.file] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">#{idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground truncate max-w-[280px]" title={file.file}>
                    {file.file.split(/[/\\]/).pop()}
                    <span className="block text-[10px] font-normal text-muted-foreground truncate">{file.file}</span>
                  </td>
                  <td className="px-4 py-3">{getRiskBadge(file.ml_probability)}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{(file.ml_probability * 100).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => onPreview(file)}
                        className="px-2.5 py-1.5 text-xs bg-secondary/60 hover:bg-primary/20 hover:text-primary rounded-lg transition-colors flex items-center space-x-1 border border-border"
                        title="Open Complete Code Viewer"
                      >
                        <Code2 size={14} />
                        <span>Preview</span>
                      </button>
                      <button
                        onClick={() => onResolve(file)}
                        className="px-2.5 py-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition-colors flex items-center space-x-1 border border-purple-500/30"
                        title="Generate AI Auto-Fix"
                      >
                        <Sparkles size={14} />
                        <span>AI Fix</span>
                      </button>
                    </div>
                  </td>
                </tr>

                <AnimatePresence>
                  {expandedRows[file.file] && (
                    <motion.tr
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-secondary/10"
                    >
                      <td colSpan={6} className="px-6 py-4 border-b border-border/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                          <div className="space-y-2">
                            <p className="font-semibold text-muted-foreground flex items-center space-x-1">
                              <AlertTriangle size={14} className="text-yellow-400" />
                              <span>Detected Risk Triggers</span>
                            </p>
                            <p className="text-foreground leading-relaxed">{file.risk_cause_description}</p>
                            <div className="flex space-x-4 pt-2 text-[11px] text-muted-foreground font-mono">
                              <span>LOC: {file.loc}</span>
                              <span>Complexity: {file.complexity}</span>
                              <span>Past Bugs: {file.previous_bug_count || 0}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="font-semibold text-muted-foreground flex items-center justify-between">
                              <span>Flagged Suspicious Lines ({file.suspicious_count || 0})</span>
                              <span className="text-[10px] text-muted-foreground font-normal">Click line to jump in code viewer</span>
                            </p>
                            {file.suspicious_lines && file.suspicious_lines.length > 0 ? (
                              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                {file.suspicious_lines.map((line: any, i: number) => (
                                  <div
                                    key={i}
                                    onClick={() => onPreview(file, line.line_number)}
                                    className="p-2 rounded bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 cursor-pointer flex items-center justify-between text-destructive transition-colors group"
                                  >
                                    <span className="font-mono font-bold">Line {line.line_number}:</span>
                                    <span className="truncate mx-2 flex-1 text-[11px] text-foreground">{line.issue || line.reason}</span>
                                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted-foreground italic">No specific lines flagged by static AST analysis.</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))}

            {filteredFiles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No repository files match the search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RiskTable;
