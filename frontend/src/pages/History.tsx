import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { History as HistoryIcon, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { analysisAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

const History = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      analysisAPI.getHistory(user.id).then((res) => {
        if (res.success) {
          setHistory(res.history);
        }
        setLoading(false);
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-2xl mx-auto"
      >
        <div className="bg-primary/10 p-4 rounded-full text-primary mb-6">
          <HistoryIcon size={48} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">This is your first analysis</h1>
        <p className="text-muted-foreground text-lg mb-8">
          You haven't run any repository analyses yet. Your complete analysis history, including risk scores and AI resolutions, will appear here.
        </p>
        <button
          onClick={() => navigate('/analysis')}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-primary/90 transition-all"
        >
          <span>Run First Analysis</span>
          <ArrowRight size={18} />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Analysis History</h1>
        <p className="text-muted-foreground mt-2">View your past repository analyses and risk intelligence reports.</p>
      </header>

      <div className="glass rounded-xl p-6 border border-border overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-3 font-medium">Repository</th>
                <th className="pb-3 font-medium">Mode</th>
                <th className="pb-3 font-medium">Total Files</th>
                <th className="pb-3 font-medium">High Risk</th>
                <th className="pb-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                  <td className="py-4 font-medium">{item.repo_name}</td>
                  <td className="py-4">
                    <span className="px-2 py-1 bg-secondary rounded-md text-xs">{item.analysis_mode?.split(' ')[0] || 'Normal'}</span>
                  </td>
                  <td className="py-4">{item.total_files}</td>
                  <td className="py-4">
                    <span className={item.high_risk_count > 0 ? 'text-destructive font-semibold' : ''}>
                      {item.high_risk_count}
                    </span>
                  </td>
                  <td className="py-4 text-muted-foreground">
                    {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default History;
