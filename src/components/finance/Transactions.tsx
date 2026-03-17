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
  const [searchTerm, setSearchTerm] = useState('');
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
    if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Calcular totais do período
  const periodTotalCredit = filteredTx.filter(t => t.type === 'credit').reduce((s, t) => s + t.value, 0);
  const periodTotalDebit = filteredTx.filter(t => t.type === 'debit').reduce((s, t) => s + t.value, 0);
  const periodBalance = periodTotalCredit - periodTotalDebit;

  // Agrupar por data
  const groupedByDate = filteredTx.reduce((acc, t) => {
    if (!acc[t.date]) acc[t.date] = [];
    acc[t.date].push(t);
    return acc;
  }, {} as Record<string, typeof transactions>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const handleAdd = async () => {
    if (isAdding) return;
    
    if (!form.description || !form.bank || !form.category || !form.value) {
      showNotification('Preencha todos os campos!', 'error');
      return;
    }
    
    setIsAdding(true);
    try {
      await addTransaction({ 
        ...form, 
        description: toUpperCase(form.description),
        value: parseFloat(form.value) 
      });
      setForm({ 
        date: form.date, 
        description: '', 
        bank: form.bank, 
        type: form.type, 
        category: form.category, 
        value: '' 
      });
      showNotification('Transação adicionada!', 'success');
      descriptionRef.current?.focus();
    } catch (error: any) {
      console.error('Erro ao adicionar transação:', error);
      const errorMsg = error?.message || 'Falha ao adicionar';
      showNotification(`Erro: ${errorMsg}`, 'error');
      
      if (errorMsg.includes('Sessão') || errorMsg.includes('JWT')) {
        showNotification('Sessão expirada! Por favor, faça login novamente.', 'error');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
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

  const balances: Record<string, number> = {};
  banks.forEach(b => { balances[b.id] = getBankBalance(b.id); });

  return (
    <div>
      {/* Novo Lançamento */}
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
              <option value="debit">💸 Débito (Saída)</option>
              <option value="credit">💰 Crédito (Entrada)</option>
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
            {isAdding ? '⏳ Adicionando...' : '➕ Adicionar'}
          </button>
        </div>

        {/* Saldo Inicial */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem', color: '#6b7280' }}>⚙️ Ajustar Saldo Inicial</h4>
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
            <button className="btn btn-success" style={{ marginTop: '0' }} onClick={handleInitialBalance}>💾 Salvar</button>
          </div>
        </div>
      </div>

      {/* Pagamento de Fatura */}
      <div className="card payment-card">
        <h3 style={{ marginBottom: '1rem', color: '#3b82f6' }}>💳 Pagamento de Fatura</h3>
        <PaymentForm banks={banks} creditCards={[]} showNotification={showNotification} />
      </div>

      {/* Resumo do Período */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f0fdf4', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>ENTRADAS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#22c55e' }}>{fmt(periodTotalCredit)}</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#fef2f2', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>SAÍDAS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444' }}>{fmt(periodTotalDebit)}</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: periodBalance >= 0 ? '#eff6ff' : '#fef2f2', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>SALDO</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: periodBalance >= 0 ? '#2563eb' : '#ef4444' }}>
              {fmt(periodBalance)}
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>LANÇAMENTOS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#374151' }}>{filteredTx.length}</div>
          </div>
        </div>
      </div>

      {/* Filtros e Lista */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>📋 Lançamentos</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-sm btn-secondary" onClick={() => {
              const csv = exportToCSV();
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `lancamentos_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
            }}>
              📥 CSV
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Buscar por descrição..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
          <div className="filter-bar">
            <select className="form-select" value={filters.bank} onChange={e => setFilters({...filters, bank: e.target.value})}>
              <option value="">Bancos</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
            </select>
            <select className="form-select" value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
              <option value="">Tipos</option>
              <option value="credit">💰 Entrada</option>
              <option value="debit">💸 Saída</option>
            </select>
            <select className="form-select" value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}>
              <option value="">Categorias</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <select className="form-select" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})}>
              <option value="">Todas as Datas</option>
              <option value="thisMonth">Este Mês</option>
            </select>
            <button className="btn btn-secondary btn-sm" onClick={() => { setFilters({ bank: '', type: '', category: '', date: 'thisMonth' }); setSearchTerm(''); }}>Limpar</button>
          </div>
        </div>

        {/* Lista agrupada por data */}
        {sortedDates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📭</div>
            Nenhum lançamento encontrado
          </div>
        ) : (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {sortedDates.map(date => {
              const dayTx = groupedByDate[date];
              const dayCredit = dayTx.filter(t => t.type === 'credit').reduce((s, t) => s + t.value, 0);
              const dayDebit = dayTx.filter(t => t.type === 'debit').reduce((s, t) => s + t.value, 0);
              
              return (
                <div key={date} style={{ marginBottom: '1rem' }}>
                  {/* Cabeçalho da data */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 1rem',
                    background: '#f8fafc',
                    borderRadius: '0.5rem',
                    marginBottom: '0.25rem',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: '#475569' }}>{fmtDate(date)}</span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        ({dayTx.length} lançamento{dayTx.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                      {dayCredit > 0 && <span style={{ color: '#22c55e', fontWeight: 600 }}>+{fmt(dayCredit)}</span>}
                      {dayDebit > 0 && <span style={{ color: '#ef4444', fontWeight: 600 }}>-{fmt(dayDebit)}</span>}
                    </div>
                  </div>

                  {/* Transações do dia */}
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: '80px' }}>Ações</th>
                          <th>Descrição</th>
                          <th>Banco</th>
                          <th>Categoria</th>
                          <th style={{ width: '80px' }}>Tipo</th>
                          <th style={{ width: '120px', textAlign: 'right' }}>Valor</th>
                          <th style={{ width: '120px', textAlign: 'right' }}>Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayTx.map((t, idx) => (
                          <tr key={t.id} style={{ 
                            background: idx % 2 === 0 ? 'white' : '#fafafa',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f0f9ff'}
                          onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#fafafa'}
                          >
                            <td>
                              <div className="table-actions">
                                <button 
                                  className="btn btn-sm btn-secondary" 
                                  onClick={() => { setEditTx(t); setShowEdit(true); }}
                                  title="Editar"
                                >
                                  ✏️
                                </button>
                                <button 
                                  className="btn btn-sm btn-danger" 
                                  onClick={() => handleDelete(t.id)}
                                  title="Excluir"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                            <td>
                              <strong>{t.description}</strong>
                            </td>
                            <td>
                              <span className="badge bank" style={{ fontSize: '0.75rem' }}>
                                {getBankIcon(t.bank)} {getBankName(t.bank)}
                              </span>
                            </td>
                            <td>
                              <span className="badge category" style={{ fontSize: '0.75rem' }}>
                                {getCategoryIcon(t.category)} {getCategoryName(t.category)}
                              </span>
                            </td>
                            <td>
                              <span 
                                className="badge" 
                                style={{ 
                                  fontSize: '0.7rem',
                                  background: t.type === 'credit' ? '#dcfce7' : '#fee2e2',
                                  color: t.type === 'credit' ? '#166534' : '#991b1b'
                                }}
                              >
                                {t.type === 'credit' ? '💰 Entrada' : '💸 Saída'}
                              </span>
                            </td>
                            <td style={{ 
                              textAlign: 'right', 
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              color: t.type === 'debit' ? '#ef4444' : '#22c55e'
                            }}>
                              {t.type === 'debit' ? '-' : '+'}{fmt(t.value)}
                            </td>
                            <td style={{ textAlign: 'right', color: '#6b7280', fontSize: '0.85rem' }}>
                              {fmt(balances[t.bank] || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
      <button className="btn btn-success" style={{ marginTop: '1.5rem' }} onClick={handlePay}>💳 Pagar Fatura</button>
    </div>
  );
}
