'use client';

import React, { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { EMOJI_LIST, toUpperCase } from '@/lib/types';

export function Banks({ showNotification }: { showNotification: (msg: string, type: 'success' | 'error') => void }) {
  const { banks, addBank, updateBank, deleteBank, getBankBalance } = useFinance();
  const [form, setForm] = useState({ name: '', icon: '🏦', initialBalance: '0' });
  const [editId, setEditId] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const handleSave = async () => {
    if (!form.name) {
      showNotification('Preencha o nome!', 'error');
      return;
    }
    const data = { name: toUpperCase(form.name), icon: form.icon, initialBalance: parseFloat(form.initialBalance) || 0 };
    if (editId) {
      await updateBank(editId, data);
      showNotification('Banco atualizado!', 'success');
      setEditId(null);
    } else {
      await addBank(data);
      showNotification('Banco adicionado!', 'success');
    }
    setForm({ name: '', icon: '🏦', initialBalance: '0' });
  };

  const startEdit = (b: any) => {
    setEditId(b.id);
    setForm({ name: b.name, icon: b.icon, initialBalance: String(b.initialBalance || 0) });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Excluir banco?')) {
      await deleteBank(id);
      showNotification('Excluído!', 'success');
    }
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1rem' }}>Meus Bancos</h3>
      
      {/* Form */}
      <div className="form-grid" style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
        <div className="form-group">
          <label className="form-label">Nome</label>
          <input 
            type="text" 
            className="form-input uppercase" 
            placeholder="NOME DO BANCO" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
            onBlur={e => setForm({...form, name: toUpperCase(e.target.value)})}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Emoji</label>
          <div style={{ position: 'relative' }}>
            <button type="button" className="form-input" style={{ textAlign: 'center', fontSize: '1.5rem' }} onClick={() => setShowEmoji(!showEmoji)}>
              {form.icon}
            </button>
            {showEmoji && (
              <div className="emoji-picker" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10 }}>
                {EMOJI_LIST.map(e => (
                  <div key={e} className="emoji-option" onClick={() => { setForm({...form, icon: e}); setShowEmoji(false); }}>{e}</div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Saldo Inicial</label>
          <input type="number" step="0.01" className="form-input" placeholder="0,00" value={form.initialBalance} onChange={e => setForm({...form, initialBalance: e.target.value})} />
        </div>
        <button className="btn btn-success" style={{ marginTop: '1.5rem' }} onClick={handleSave}>
          {editId ? 'Atualizar' : 'Adicionar'}
        </button>
        {editId && (
          <button className="btn btn-secondary" style={{ marginTop: '1.5rem' }} onClick={() => { setEditId(null); setForm({ name: '', icon: '🏦', initialBalance: '0' }); }}>
            Cancelar
          </button>
        )}
      </div>

      {/* Banks Grid */}
      <div className="categories-grid">
        {banks.map(b => {
          const balance = getBankBalance(b.id);
          return (
            <div key={b.id} className="category-card">
              <div className="category-icon">{b.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{b.name}</div>
              <div style={{ margin: '0.5rem 0', fontWeight: 600 }}>
                Saldo: <span style={{ color: balance >= 0 ? '#10b981' : '#ef4444' }}>{fmt(balance)}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button className="btn btn-sm btn-secondary" onClick={() => startEdit(b)}>Editar</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(b.id)}>Excluir</button>
              </div>
            </div>
          );
        })}
      </div>

      {banks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          Nenhum banco cadastrado
        </div>
      )}
    </div>
  );
}
