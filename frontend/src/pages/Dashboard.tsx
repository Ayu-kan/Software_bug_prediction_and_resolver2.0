import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { analysisAPI } from '../services/api';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldCheck, ShieldAlert, FileWarning, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Dashboard = () => {
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

  const latestAnalysis = history.length > 0 ? history[0] : null;

  const getChartData = (analysis: any) => {
    if (!analysis) return [];
    return [
      { name: 'High Risk', value: analysis.high_risk_count, color: 'hsl(var(--destructive))' },
      { name: 'Low/Med Risk', value: analysis.total_files - analysis.high_risk_count, color: 'hsl(var(--primary))' }
    ];
  };

  const chartData = getChartData(latestAnalysis);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.username}</h1>
        <p className="text-muted-foreground mt-2">Here is the overview of your repository risk intelligence.</p>
      </header>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Analyses" value={history.length} icon={<Activity size={24} />} delay={0.1} />
        <MetricCard title="Latest Repo" value={latestAnalysis?.repo_name || 'N/A'} icon={<ShieldCheck size={24} />} delay={0.2} />
        <MetricCard title="Total Files (Latest)" value={latestAnalysis?.total_files || 0} icon={<FileWarning size={24} />} delay={0.3} />
        <MetricCard title="High Risk Files (Latest)" value={latestAnalysis?.high_risk_count || 0} icon={<ShieldAlert size={24} className="text-destructive" />} delay={0.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Risk Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-1 glass rounded-xl p-6 border border-border"
        >
          <h2 className="text-xl font-semibold mb-4">Latest Risk Distribution</h2>
          {latestAnalysis ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: 'none', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center space-x-4 text-sm mt-4">
                {chartData.map(d => (
                  <div key={d.name} className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
                    <span>{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
              <p>No analysis data available.</p>
            </div>
          )}
        </motion.div>

        {/* History Table */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-2 glass rounded-xl p-6 border border-border overflow-hidden flex flex-col"
        >
          <h2 className="text-xl font-semibold mb-4">Recent Analyses</h2>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Loading history...</p>
            </div>
          ) : history.length > 0 ? (
            <div className="overflow-auto flex-1">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-3 font-medium">Repository</th>
                    <th className="pb-3 font-medium">Mode</th>
                    <th className="pb-3 font-medium">Files</th>
                    <th className="pb-3 font-medium">High Risk</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 5).map((item) => (
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
          ) : (
             <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">No recent analyses found.</p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

const MetricCard = ({ title, value, icon, delay }: { title: string, value: string | number, icon: React.ReactNode, delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="glass p-6 rounded-xl border border-border flex items-center space-x-4"
  >
    <div className="p-3 bg-secondary rounded-lg">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <h3 className="text-2xl font-bold">{value}</h3>
    </div>
  </motion.div>
);

export default Dashboard;
