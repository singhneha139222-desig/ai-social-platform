import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import { ShieldAlert, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

export default function BotDetectionPanel({ userId }) {
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const toast = useToast();
  const socket = useSocket();

  const fetchScan = async () => {
    try {
      const res = await adminAPI.getLatestBotScan(userId);
      setScan(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScan();
  }, [userId]);

  useEffect(() => {
    if (!socket) return;
    
    const handleUpdate = (data) => {
      if (data.userId === userId) {
        setScan(data.scanResult);
        if (data.scanResult.status === 'completed') {
          toast.success('Bot detection scan completed');
          setScanning(false);
        } else if (data.scanResult.status === 'failed') {
          toast.error('Bot detection scan failed');
          setScanning(false);
        }
      }
    };

    socket.on('bot_detection:update', handleUpdate);
    return () => socket.off('bot_detection:update', handleUpdate);
  }, [socket, userId]);

  const handleScan = async () => {
    setScanning(true);
    try {
      await adminAPI.triggerBotScan(userId, true);
      toast.success('Bot scan initiated');
      // Wait for socket update...
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to trigger scan');
      setScanning(false);
    }
  };

  if (loading) return <div className="post-card skeleton" style={{ height: '150px' }}></div>;

  return (
    <div className="post-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <ShieldAlert size={20} style={{ color: 'var(--accent-primary)' }} />
            Bot Detection & Risk Analysis
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Powered by GraphSAGE & Heuristic Node Features
          </p>
        </div>
        <button 
          className="btn btn--secondary" 
          onClick={handleScan} 
          disabled={scanning || scan?.status === 'pending'}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
        >
          <RefreshCw size={14} className={scanning || scan?.status === 'pending' ? 'spin' : ''} />
          {scanning || scan?.status === 'pending' ? 'Scanning...' : 'Run Scan'}
        </button>
      </div>

      {!scan ? (
        <div className="empty-state" style={{ padding: '1rem' }}>
          <p>No prior bot scan exists for this user.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>
              Model-Estimated Probability
            </div>
            {scan.status === 'completed' && scan.botProbability != null ? (
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div style={{ 
                      fontSize: '2rem', 
                      fontWeight: 700, 
                      color: scan.botProbability > 0.8 ? 'var(--error)' : scan.botProbability > 0.4 ? 'var(--warning)' : 'var(--success)'
                  }}>
                    {(scan.botProbability * 100).toFixed(1)}%
                  </div>
               </div>
            ) : (
               <div style={{ marginTop: '0.5rem', fontWeight: 600 }}>{scan.status === 'pending' ? 'Calculating...' : 'N/A'}</div>
            )}
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>
              Risk Level
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {scan.riskLevel === 'Low' && <CheckCircle size={20} color="var(--success)" />}
              {(scan.riskLevel === 'Medium' || scan.riskLevel === 'High') && <AlertTriangle size={20} color="var(--warning)" />}
              {scan.riskLevel === 'Critical' && <ShieldAlert size={20} color="var(--error)" />}
              {scan.riskLevel === 'insufficient_data' && <span style={{ color: 'var(--text-muted)' }}>Not Enough Data</span>}
              <span style={{ fontSize: '1.25rem', fontWeight: 600, textTransform: 'capitalize' }}>
                {scan.riskLevel === 'insufficient_data' ? 'Insufficient Data' : scan.riskLevel || scan.status}
              </span>
            </div>
          </div>
          
          {scan.featuresUsed && Object.keys(scan.featuresUsed).length > 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Behavioral Signals Used (Model Inputs)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {Object.entries(scan.featuresUsed).map(([key, val]) => (
                   <span key={key} className="badge badge--ghost" style={{ fontSize: '0.75rem' }}>
                     {key}: {val}
                   </span>
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontStyle: 'italic' }}>
                Note: These signals are model inputs. Performance is measured against weakly supervised heuristics, not human ground-truth labels.
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
