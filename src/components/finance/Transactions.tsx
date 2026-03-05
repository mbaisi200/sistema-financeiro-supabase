'use client';

import React, { useState, useRef } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { EditTransactionModal } from './Modals';
import { toUpperCase } from '@/lib/types';
import { SearchableSelect } from './SearchableSelect';

export function Transactions({ showNotification }: { showNotification: (msg: string, type: 'success' | 'error') => void }) {
  const { transactions, banks, categories, addTransaction, updateTransaction, deleteTransaction, updateBank, getBankName, getBankIcon, getCategoryName, getCategoryIcon, getBankBalance, exportToCSV, exportToJSON } = useFinance();
  
  const [filters, setFilters] = useState({ bank: '', type: '', category: '', date: 'thisMonth' });
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', bank: '', type: 'debit' as const, category: '', value: '' });
  const [initialBank, setInitialBank] = useState('');
  const [initialValue, setInitialValue] = useState('');
  const [editTx, setEditTx] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const descriptionRef = useRef<HTMLInputElement>(null);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmtDate = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '';

  const now = new Date();
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const filteredTx = transactions.filter(t => {
    if (filters.bank && t.bank !== filters.bank) return false;
    if (filters.type && t.type !== filters.type) return false;
    if (filters.category && t.category !== filters.category) return false;
    if (filters.date === 'thisMonth' && !t.date.startsWith(thisMonthStr)) return false;
    return true;
  });

  const handleAdd = async () => {
    if (isAdding) return; // Prevenir múltiplos cliques
    
    if (!form.description || !form.bank || !form.category || !form.value) {
      showNotification('Preencha todos os campos!', 'error');
      return;
    }
    
    setIsAdding(true);
    try {
      // Converter descrição para maiúsculo
      await addTransaction({ 
        ...form, 
        description: toUpperCase(form.description),
        value: parseFloat(form.value) 
      });
      // Mantém os dados anteriores, exceto descrição e valor
      setForm({ 
        date: form.date, 
        description: '', 
        bank: form.bank, 
        type: form.type, 
        category: form.category, 
        value: '' 
      });
      showNotification('Transação adicionada!', 'success');
      // Foca no campo descrição para próxima digitação
      descriptionRef.current?.focus();
    } catch (error: any) {
      console.error('Erro ao adicionar transação:', error);
      const errorMsg = error?.message || 'Falha ao adicionar';
      showNotification(`Erro: ${errorMsg}`, 'error');
      
      // Se for erro de sessão, mostrar mensagem específica
      if (errorMsg.includes('Sessão') || errorMsg.includes('JWT')) {
        showNotification('Sessão expirada! Por favor, faça login novamente.', 'error');
      }
    } finally {
      setIsAdding(false);
    }
  };

  // Enter para adicionar
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Excluir transação?')) {
      await deleteTransaction(id);
      showNotification('Excluído!', 'success');
    }
  };

  const handleInitialBalance = async () => {
    if (!initialBank) return;
    await updateBank(initialBank, { initialBalance: parseFloat(initialValue) || 0 });
    showNotification('Saldo ajustado!', 'success');
    setInitialBank('');
    setInitialValue('');
  };

  // Calculate balances
  const balances: Record<string, number> = {};
  banks.forEach(b => { balances[b.id] = getBankBalance(b.id); });

  return (
    <div>
      {/* New Transaction */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>📝 Novo Lançamento</h3>
        <div className="form-grid" onKeyPress={handleKeyPress}>
          <div className="form-group">
            <label className="form-label">Data</label>
            <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <input 
              ref={descriptionRef}
              type="text" 
              className="form-input uppercase" 
              placeholder="DESCRIÇÃO" 
              value={form.description} 
              onChange={e => setForm({...form, description: e.target.value})} 
              onBlur={e => setForm({...form, description: toUpperCase(e.target.value)})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Banco</label>
            <select className="form-select" value={form.bank} onChange={e => setForm({...form, bank: e.target.value})}>
              <option value="">Selecione</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select className="form-select" value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
              <option value="debit">Débito</option>
              <option value="credit">Crédito</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <SearchableSelect
              options={categories.map(c => ({ id: c.id, icon: c.icon, name: c.name }))}
              value={form.category}
              onChange={(val) => setForm({...form, category: val})}
              placeholder="Digite para buscar..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Valor</label>
            <input 
              type="number" 
              step="0.01" 
              className="form-input" 
              placeholder="0,00" 
              value={form.value} 
              onChange={e => setForm({...form, value: e.target.value})} 
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            />
          </div>
          <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={handleAdd} disabled={isAdding}>
            {isAdding ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>

        {/* Initial Balance */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <h4 style={{ marginBottom: '1rem' }}>Ajustar Saldo Inicial</h4>
          <div className="form-grid">
            <div className="form-group">
              <select className="form-select" value={initialBank} onChange={e => setInitialBank(e.target.value)}>
                <option value="">Selecione Banco</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <input type="number" step="0.01" className="form-input" placeholder="Valor (R$)" value={initialValue} onChange={e => setInitialValue(e.target.value)} />
            </div>
            <button className="btn btn-success" style={{ marginTop: '0' }} onClick={handleInitialBalance}>Salvar</button>
          </div>
        </div>
      </div>

      {/* Payment Card */}
      <div className="card payment-card">
        <h3 style={{ marginBottom: '1rem', color: '#3b82f6' }}>💳 Pagamento de Fatura</h3>
        <PaymentForm banks={banks} creditCards={[]} showNotification={showNotification} />
      </div>

      {/* Filters & List */}
      <div className="card">
        <div className="filter-bar">
          <select className="form-select" value={filters.bank} onChange={e => setFilters({...filters, bank: e.target.value})}>
            <option value="">Bancos</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
          </select>
          <select className="form-select" value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
            <option value="">Tipos</option>
            <option value="credit">Crédito</option>
            <option value="debit">Débito</option>
          </select>
          <select className="form-select" value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}>
            <option value="">Categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <select className="form-select" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})}>
            <option value="">Datas</option>
            <option value="thisMonth">Este Mês</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ bank: '', type: '', category: '', date: 'thisMonth' })}>Limpar</button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Ações</th>
                <th>Data</th>
                <th>Desc</th>
                <th>Banco</th>
                <th>Cat</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Nenhum lançamento</td></tr>
              ) : filteredTx.map(t => (
                <tr key={t.id}>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-sm btn-secondary" onClick={() => { setEditTx(t); setShowEdit(true); }}>✏️</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}>🗑️</button>
                    </div>
                  </td>
                  <td>{fmtDate(t.date)}</td>
                  <td>{t.description}</td>
                  <td><span className="badge bank">{getBankIcon(t.bank)} {getBankName(t.bank)}</span></td>
                  <td><span className="badge category">{getCategoryIcon(t.category)} {getCategoryName(t.category)}</span></td>
                  <td><span className={`badge ${t.type}`}>{t.type === 'credit' ? 'Entrada' : 'Saída'}</span></td>
                  <td className={`text-right ${t.type === 'debit' ? 'value-debit' : 'value-credit'}`}>{fmt(t.value)}</td>
                  <td className="text-right">{fmt(balances[t.bank] || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EditTransactionModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        transaction={editTx}
        banks={banks}
        categories={categories}
        onSave={updateTransaction}
        showNotification={showNotification}
      />
    </div>
  );
}

function PaymentForm({ banks, creditCards, showNotification }: { banks: any[], creditCards: any[], showNotification: (msg: string, type: 'success' | 'error') => void }) {
  const { payCardInvoice, creditCards: cards } = useFinance();
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], bank: '', card: '', value: '' });

  const handlePay = async () => {
    if (!form.bank || !form.card || !form.value) {
      showNotification('Preencha todos os campos!', 'error');
      return;
    }
    await payCardInvoice(form.card, form.bank, parseFloat(form.value), form.date);
    showNotification('Pagamento realizado!', 'success');
    setForm({ date: new Date().toISOString().split('T')[0], bank: '', card: '', value: '' });
  };

  return (
    <div className="form-grid">
      <div className="form-group">
        <label className="form-label">Data</label>
        <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
      </div>
      <div className="form-group">
        <label className="form-label">De (Banco)</label>
        <select className="form-select" value={form.bank} onChange={e => setForm({...form, bank: e.target.value})}>
          <option value="">Selecione</option>
          {banks.map(b => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Para (Cartão)</label>
        <select className="form-select" value={form.card} onChange={e => setForm({...form, card: e.target.value})}>
          <option value="">Selecione</option>
          {cards.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Valor</label>
        <input type="number" step="0.01" className="form-input" placeholder="0,00" value={form.value} onChange={e => setForm({...form, value: e.target.value})} />
      </div>
      <button className="btn btn-success" style={{ marginTop: '1.5rem' }} onClick={handlePay}>Pagar</button>
    </div>
  );
}
