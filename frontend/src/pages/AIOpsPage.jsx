import { useEffect, useState } from 'react';
import { Bot, Play, Server, AlertTriangle, ShieldAlert, Cpu, Loader2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { Card, Badge, LoadingState, ErrorState, Button } from '../components/ui/Primitives';
import EventPicker from '../components/ui/EventPicker';

export default function AIOpsPage() {
  const [agents, setAgents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Scenario state
  const [scenario, setScenario] = useState('');
  const [eventId, setEventId] = useState(localStorage.getItem('lastEventId') || '');
  const [runLoading, setRunLoading] = useState(false);
  const [scenarioResult, setScenarioResult] = useState(null);

  const SCENARIOS = [
    'Venue Capacity Issue',
    'Speaker Conflict',
    'Technical Failure',
    'Medical Emergency',
    'Sponsor Issue'
  ];

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [agentsRes, alertsRes] = await Promise.all([
          api.get('/ai-ops/agents'),
          api.get('/ai-ops/alerts')
        ]);
        if (mounted) {
          setAgents(agentsRes.data.agents);
          setAlerts(alertsRes.data.alerts);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(getErrorMessage(err));
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, []);

  const runScenario = async () => {
    if (!scenario) return;
    setRunLoading(true);
    setScenarioResult(null);
    try {
      const res = await api.post('/ai-ops/orchestrate', { scenario, eventId });
      setScenarioResult(res.data);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setRunLoading(false);
    }
  };

  if (loading) return <LoadingState label="Initializing AI Operations Center…" />;
  if (error) return <ErrorState message={error} />;

  const AGENT_COLORS = {
    'Venue Agent': 'border-blue-500',
    'Speaker Agent': 'border-purple-500',
    'Incident Agent': 'border-red-500',
    'Sponsor Agent': 'border-yellow-500',
    'Analytics Agent': 'border-teal-500'
  };

  return (
    <div className="space-y-8">
      {/* HEADER BANNER */}
      <div className="bg-[#0D7A66] rounded-xl p-6 text-white shadow-md">
        <h1 className="font-display text-2xl font-semibold mb-1">AI Operations Center</h1>
        <p className="text-teal-100 text-sm">Multi-Agent Orchestration & Decision Support</p>
      </div>

      {/* 1. AGENT STATUS DASHBOARD */}
      <section>
        <h2 className="font-display text-lg font-semibold text-[var(--color-text)] mb-4">
          Agent Status Dashboard
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent, idx) => (
            <Card key={idx} className={`p-4 flex flex-col gap-2 relative border-l-4 ${AGENT_COLORS[agent.name] || 'border-gray-500'}`}>
              <div className="flex justify-between items-start">
                <span className="font-semibold text-sm">{agent.name}</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-teal-500 mb-1">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                {agent.status}
              </div>
              <p className="text-xs text-[var(--color-text-dim)] flex-1 leading-relaxed">{agent.description}</p>
              <div className="mt-3 text-[10px] font-mono text-[var(--color-text-faint)] bg-[var(--color-surface-2)] p-1.5 rounded truncate">
                 POST {agent.endpoint}
              </div>
              <div className="text-[10px] text-[var(--color-text-dim)] mt-1">
                 Last used: Ready
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 2. AGENT ORCHESTRATOR */}
      <section>
        <div className="flex items-center gap-2 mb-4">
           <Bot size={20} className="text-pink-500" />
           <h2 className="font-display text-lg font-semibold text-[var(--color-text)]">
             Agent Orchestrator
           </h2>
        </div>
        <Card className="p-6 space-y-6 bg-[var(--color-surface)]">
          
          <div className="flex flex-wrap gap-3 items-center">
             {SCENARIOS.map(s => (
                <button
                   key={s}
                   onClick={() => setScenario(s)}
                   className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                     scenario === s 
                       ? 'bg-[var(--color-surface-3)] text-[var(--color-text)] border-[var(--color-border)] shadow-sm'
                       : 'bg-[var(--color-surface)] text-[var(--color-text-dim)] border-transparent hover:bg-[var(--color-surface-2)]'
                   }`}
                >
                   {s.includes('Capacity') ? '🏢 ' : s.includes('Speaker') ? '🎤 ' : s.includes('Failure') ? '⚡ ' : s.includes('Medical') ? '🏥 ' : '🤝 '}
                   {s}
                </button>
             ))}
          </div>

          <div className="flex items-center gap-4">
             <div className="flex-1 max-w-sm">
                <EventPicker value={eventId} onChange={setEventId} />
             </div>
             <Button onClick={runScenario} disabled={!scenario || runLoading} className="h-10 bg-teal-600 hover:bg-teal-700 text-white">
               {runLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
               Run Scenario
             </Button>
          </div>

          {scenarioResult && (
             <div className="mt-8 space-y-6">
                
                {/* Findings Section */}
                <div className="space-y-4">
                   <div className="bg-[var(--color-surface-2)] rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                         <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                         <h4 className="font-semibold text-sm text-[var(--color-text)]">{scenarioResult.agents.split(',')[0]} Findings</h4>
                      </div>
                      <div className="pl-4">
                         <h5 className="text-xs font-semibold uppercase text-[var(--color-text-dim)] mb-2">Findings:</h5>
                         <ul className="list-disc pl-4 text-sm space-y-2 text-[var(--color-text)]">
                            {scenarioResult.findings.split('\n').filter(f => f.trim()).map((finding, idx) => (
                               <li key={idx}>{finding.replace('Consolidated Finding:', '').trim()}</li>
                            ))}
                         </ul>
                         {scenarioResult.evidence?.length > 0 && (
                            <div className="mt-3">
                               <h5 className="text-xs font-semibold uppercase text-[var(--color-text-dim)] mb-2">Relevant Data:</h5>
                               <ul className="list-disc pl-4 text-sm space-y-1 text-[var(--color-text)]">
                                  {scenarioResult.evidence.map((ev, i) => (
                                     <li key={i}>{ev}</li>
                                  ))}
                               </ul>
                            </div>
                         )}
                      </div>
                   </div>
                </div>

                {/* Consolidated Recommendation Box */}
                <div className="bg-[#EAF5F0] dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-5">
                   <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🎯</span>
                      <h4 className="font-semibold text-teal-800 dark:text-teal-400">Consolidated Recommendation</h4>
                   </div>
                   <p className="text-teal-900 dark:text-teal-300 font-medium pl-8">{scenarioResult.recommendation}</p>
                </div>
             </div>
          )}
        </Card>
      </section>

      {/* 3. DECISION SUPPORT ALERTS */}
      <section>
        <div className="flex items-center gap-2 mb-4">
           <ShieldAlert size={20} className="text-gray-400" />
           <h2 className="font-display text-lg font-semibold text-[var(--color-text)]">
             Decision Support Alerts
           </h2>
        </div>
        
        {alerts.length === 0 ? (
           <Card className="p-6 text-center text-[var(--color-text-dim)] text-sm">
              <AlertTriangle size={24} className="mx-auto mb-2 opacity-50" />
              No active alerts detected.
           </Card>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {alerts.map((alert, idx) => {
                 let borderColor = 'border-gray-500';
                 if (alert.severity === 'Critical') borderColor = 'border-red-500';
                 else if (alert.severity === 'High') borderColor = 'border-orange-500';
                 else if (alert.severity === 'Medium') borderColor = 'border-yellow-500';

                 return (
                    <Card key={idx} className={`p-4 flex flex-col gap-2 relative border-l-4 ${borderColor}`}>
                       <h3 className="font-semibold text-sm leading-tight text-[var(--color-text)]">
                          {alert.title}
                       </h3>
                       <div className="text-xs text-[var(--color-text-dim)] mb-1">
                          <span className="font-mono">{alert.event?.title || 'System'}</span>
                          {alert.evidence && <span className="block mt-1">{alert.evidence}</span>}
                       </div>
                       
                       {alert.recommendedAction && (
                          <div className="mt-auto pt-2 text-xs font-semibold text-[var(--color-text)]">
                             Action: <span className="font-normal text-[var(--color-text-dim)]">{alert.recommendedAction}</span>
                          </div>
                       )}
                    </Card>
                 );
              })}
           </div>
        )}
      </section>
    </div>
  );
}
