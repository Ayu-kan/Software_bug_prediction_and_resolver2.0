import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, AlertTriangle, Code2, Sparkles } from 'lucide-react';

interface RiskTableProps {
  files: any[];
  onPreview: (file: any) => void;
  onResolve: (file: any) => void;
}

const RiskTable: React.FC<RiskTableProps> = ({ files, onPreview, onResolve }) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const toggleRow = (path: string) => {
    setExpandedRows(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const getRiskBadge = (prob: number) => {
    if (prob >= 0.7) return <span className="px-2 py-1 text-xs font-semibold rounded bg-destructive/10 text-destructive border border-destructive/20">High</span>;
    if (prob >= 0.4) return <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Medium</span>;
    return <span className="px-2 py-1 text-xs font-semibold rounded bg-green-500/10 text-green-500 border border-green-500/20">Low</span>;
  };

  const filteredFiles = files.filter(f => f.file.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <input
          type="text"
          placeholder="Search files..."
          className="w-64 bg-secondary/30 border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">Showing {filteredFiles.length} files</span>
      </div>

      <div className="border border-border rounded-lg overflow-hidden glass">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 font-medium w-10"></th>
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">File Path</th>
              <th className="px-4 py-3 font-medium">Risk Level</th>
              <th className="px-4 py-3 font-medium">ML Prob</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFiles.map((file, idx) => (
              <React.Fragment key={file.file}>
                <tr className="border-b border-border/50 hover:bg-secondary/20 transition-colors group">
                  <td className="px-4 py-3 text-center cursor-pointer" onClick={() => toggleRow(file.file)}>
                    {expandedRows[file.file] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">#{idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs truncate max-w-[250px]" title={file.file}>
                    {file.file.split(/[/\\]/).pop()}
                  </td>
                  <td className="px-4 py-3">{getRiskBadge(file.ml_probability)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{(file.ml_probability * 100).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => onPreview(file)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                        title="Preview Code"
                      >
                        <Code2 size={16} />
                      </button>
                      <button
                        onClick={() => onResolve(file)}
                        className="p-1.5 text-muted-foreground hover:text-purple-400 hover:bg-purple-400/10 rounded transition-colors flex items-center space-x-1"
                        title="AI Auto-Resolve"
                      >
                        <Sparkles size={16} />
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
                      <td colSpan={6} className="px-4 py-4 border-b border-border/50">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="font-semibold text-muted-foreground mb-1 flex items-center"><AlertTriangle size={14} className="mr-1"/> Risk Factors</p>
                            <p>{file.risk_cause_description}</p>
                            <p className="mt-2 text-muted-foreground">LOC: {file.loc} | Complexity: {file.complexity}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-muted-foreground mb-1">Suspicious Lines: {file.suspicious_count}</p>
                            {file.suspicious_lines && file.suspicious_lines.length > 0 ? (
                              <ul className="list-disc list-inside text-[11px] font-mono text-destructive space-y-1">
                                {file.suspicious_lines.slice(0, 3).map((line: any, i: number) => (
                                  <li key={i} className="truncate">L{line.line_number}: {line.issue}</li>
                                ))}
                                {file.suspicious_lines.length > 3 && <li>...and {file.suspicious_lines.length - 3} more</li>}
                              </ul>
                            ) : (
                              <p className="text-muted-foreground italic">None detected by static analysis.</p>
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
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No files found matching criteria.
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
