import React, { useState } from 'react';
import { setActivationKey } from '../lib/activationKey';

interface ActivationKeyPromptProps {
  onActivated: (resourceData: any) => void;
}

const ActivationKeyPrompt: React.FC<ActivationKeyPromptProps> = ({ onActivated }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Validate key by calling activation API
      const res = await fetch(`https://sb.asasconnect.com/api/digitalsigns/activate/${key}`, {
        headers: { 'ActivationKey': key }
      });
      if (!res.ok) throw new Error('Invalid activation key');
      await setActivationKey(key);
      const resourceData = await res.json();
      onActivated(resourceData);
    } catch (err) {
      setError('Invalid activation key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white">
      <form onSubmit={handleSubmit} className="bg-black/60 p-8 rounded-xl shadow-xl flex flex-col gap-4 w-full max-w-xs">
        <h2 className="text-2xl font-black mb-2">Enter Activation Key</h2>
        <input
          type="text"
          value={key}
          onChange={e => setKey(e.target.value)}
          className="p-3 rounded bg-white/10 border border-white/20 text-white font-mono text-lg"
          placeholder="Activation Key"
          required
        />
        {error && <div className="text-red-400 font-bold text-sm">{error}</div>}
        <button
          type="submit"
          disabled={loading || !key}
          className="bg-primary text-white font-black py-3 rounded-xl mt-2 disabled:opacity-50"
        >
          {loading ? 'Validating...' : 'Activate'}
        </button>
      </form>
    </div>
  );
};

export default ActivationKeyPrompt;
