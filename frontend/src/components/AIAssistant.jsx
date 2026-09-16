import { useState } from 'react';
import { Send, Bot, Sparkles, Loader2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { Card } from './ui/Primitives';

export default function AIAssistant({ eventId }) {
    const [query, setQuery] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const ask = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        const userMsg = query.trim();
        setQuery('');
        setHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const res = await api.post('/analytics/assistant', { query: userMsg, eventId });
            setHistory(prev => [...prev, { 
                role: 'agent', 
                content: res.data.answer, 
                evidence: res.data.evidence,
                intent: res.data.intent 
            }]);
        } catch (err) {
            setHistory(prev => [...prev, { role: 'agent', content: `Error: ${getErrorMessage(err)}` }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="flex flex-col h-[500px] border border-[var(--color-border)]">
            <div className="p-3 border-b border-[var(--color-border)] flex items-center gap-2 bg-[var(--color-surface-2)] rounded-t-lg">
                <Sparkles size={16} className="text-[var(--color-amber)]" />
                <h3 className="font-semibold text-sm">Event Intelligence Assistant</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {history.length === 0 && (
                    <div className="text-center text-sm text-[var(--color-text-dim)] mt-10">
                        <Bot size={32} className="mx-auto mb-2 opacity-50" />
                        <p>Ask me anything about your events, risks, or predictions.</p>
                    </div>
                )}
                {history.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                            msg.role === 'user' ? 'bg-[var(--color-amber)] text-black' : 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
                        }`}>
                            {msg.content}
                        </div>
                        {msg.role === 'agent' && msg.evidence?.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1 max-w-[85%]">
                                {msg.evidence.map((ev, j) => (
                                    <span key={j} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-3)] text-[var(--color-text-dim)] border border-[var(--color-border)]">
                                        {ev}
                                    </span>
                                ))}
                            </div>
                        )}
                        {msg.role === 'agent' && msg.intent && (
                            <span className="text-[10px] uppercase text-[var(--color-text-dim)] mt-1 flex items-center gap-1">
                                <Bot size={10} /> {msg.intent} Agent
                            </span>
                        )}
                    </div>
                ))}
                {loading && (
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-dim)]">
                        <Loader2 size={14} className="animate-spin" /> Thinking...
                    </div>
                )}
            </div>

            <form onSubmit={ask} className="p-3 border-t border-[var(--color-border)] flex gap-2">
                <input 
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="E.g. What are the biggest risks?" 
                    className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-amber)]"
                    disabled={loading}
                />
                <button 
                    type="submit" 
                    disabled={loading || !query.trim()}
                    className="bg-[var(--color-amber)] text-black p-2 rounded-md disabled:opacity-50"
                >
                    <Send size={16} />
                </button>
            </form>
        </Card>
    );
}
