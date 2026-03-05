'use client';

import React, { useState } from 'react';
import { toUpperCase } from '@/lib/types';

export function ChangePasswordModal({ 
  isOpen, 
  onClose, 
  onChangePassword,
  showNotification 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onChangePassword: (password: string) => Promise<void>;
  showNotification: (msg: string, type: 'success' | 'error') => void;
}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showNotification('Senha deve ter pelo menos 6 caracteres', 'error');
      return;
    }
    setLoading(true);
    try {
      await onChangePassword(password);
      showNotification('Senha alterada com sucesso!', 'success');
      onClose();
    } catch (error) {
      showNotification('Erro ao alterar senha', 'error');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal active" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>🔒 Trocar Senha</div>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group mb-4">
            <label className="form-label">Nova Senha</label>
            <input 
              type="password" 
              className="form-input" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <div className="flex-end">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Atualizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditTransactionModal({
  isOpen,
  onClose,
  transaction,
  banks,
  categories,
  onSave,
  showNotification
}: {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  banks: any[];
  categories: any[];
  onSave: (id: string, data: any) => Promise<void>;
  showNotification: (msg: string, type: 'success' | 'error') => void;
}) {
  const [form, setForm] = useState({
    date: '',
    description: '',
    bank: '',
    type: 'debit' as const,
    category: '',
    value: ''
  });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (transaction) {
      setForm({
        date: transaction.date,
        description: transaction.description,
        bank: transaction.bank,
        type: transaction.type,
        category: transaction.category,
        value: String(transaction.value)
      });
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(transaction.id, {
        ...form,
        description: toUpperCase(form.description),
        value: parseFloat(form.value)
      });
      showNotification('Transação atualizada!', 'success');
      onClose();
    } catch (error) {
      showNotification('Erro ao atualizar', 'error');
    }
    setLoading(false);
  };

  if (!isOpen || !transaction) return null;

  return (
    <div className="modal active" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>✏️ Editar Transação</div>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Data</label>
              <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-select" value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
                <option value="debit">Débito</option>
                <option value="credit">Crédito</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <input 
                type="text" 
                className="form-input uppercase" 
                value={form.description} 
                onChange={e => setForm({...form, description: e.target.value})} 
                onBlur={e => setForm({...form, description: toUpperCase(e.target.value)})}
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Banco</label>
              <select className="form-select" value={form.bank} onChange={e => setForm({...form, bank: e.target.value})} required>
                {banks.map(b => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})} required>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Valor</label>
              <input type="number" step="0.01" className="form-input" value={form.value} onChange={e => setForm({...form, value: e.target.value})} required />
            </div>
          </div>
          <div className="flex-end" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditCreditCardTransactionModal({
  isOpen,
  onClose,
  transaction,
  creditCards,
  categories,
  onSave,
  showNotification
}: {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  creditCards: any[];
  categories: any[];
  onSave: (id: string, data: any) => Promise<void>;
  showNotification: (msg: string, type: 'success' | 'error') => void;
}) {
  const [form, setForm] = useState({
    date: '',
    description: '',
    card: '',
    category: '',
    value: ''
  });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (transaction) {
      setForm({
        date: transaction.date,
        description: transaction.description,
        card: transaction.card,
        category: transaction.category,
        value: String(Math.abs(transaction.value))
      });
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(transaction.id, {
        ...form,
        description: toUpperCase(form.description),
        value: parseFloat(form.value)
      });
      showNotification('Transação atualizada!', 'success');
      onClose();
    } catch (error) {
      showNotification('Erro ao atualizar', 'error');
    }
    setLoading(false);
  };

  if (!isOpen || !transaction) return null;

  return (
    <div className="modal active" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>✏️ Editar Lançamento do Cartão</div>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Data</label>
              <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <input 
                type="text" 
                className="form-input uppercase" 
                value={form.description} 
                onChange={e => setForm({...form, description: e.target.value})} 
                onBlur={e => setForm({...form, description: toUpperCase(e.target.value)})}
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cartão</label>
              <select className="form-select" value={form.card} onChange={e => setForm({...form, card: e.target.value})} required>
                {creditCards.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})} required>
                {categories.filter(c => c.id !== 'pagamento_cartao').map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Valor</label>
              <input type="number" step="0.01" className="form-input" value={form.value} onChange={e => setForm({...form, value: e.target.value})} required />
            </div>
          </div>
          <div className="flex-end" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
