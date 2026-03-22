'use client';

import React, { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { ScheduledTransaction, toUpperCase } from '@/lib/types';
import { SearchableSelect } from './SearchableSelect';

export function ScheduledTransactions({ showNotification }: { showNotification: (msg: string, type: 'success' | 'error') => void }) {
  const { 
    scheduledTransactions, 
    scheduledTransactionsTableExists,
    banks, 
    categories, 
    creditCards,
    addScheduledTransaction, 
    updateScheduledTransaction, 
    deleteScheduledTransaction, 
    confirmScheduledTransaction,
    getBankName,
    getBankIcon,
    getCategoryName,
    getCategoryIcon,
    getCardName,
    getCardIcon
  } = useFinance();

  const [form, setForm] = useState({
    description: '',
    type: 'single' as 'parcel' | 'recurring' | 'single',
    transactionType: 'debit' as 'debit' | 'credit',
    value: '',
    totalInstallments: '1',
    dueDate: new Date().toISOString().split('T')[0],
    category: '',
    paymentType: 'bank' as 'bank' | 'card',
    bank: '',
    card: '',
    autoConfirm: false
  });

  const [confirmModal, setConfirmModal] = useState<{
    scheduled: ScheduledTransaction;
    confirmedValue: string;
    confirmedDate: string;
  } | null>(null);

  const [editModal, setEditModal] = useState<ScheduledTransaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'today' | 'overdue' | 'upcoming'>('all');

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmtDate = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '';

  const today = new Date().toISOString().split('T')[0];

  // Filtrar lançamentos
  const filteredScheduled = scheduledTransactions
    .filter(s => s.status === 'pending')
    .filter(s => {
      if (!searchTerm) return true;
      return s.description.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .filter(s => {
      switch (filterStatus) {
        case 'today':
          return s.dueDate === today;
        case 'overdue':
          return s.dueDate < today;
        case 'upcoming':
          return s.dueDate > today;
        default:
          return true;
      }
    });

  // Agrupar por mês
  const groupedByMonth = filteredScheduled.reduce((acc, s) => {
    const monthKey = s.dueDate.substring(0, 7); // YYYY-MM
    const monthName = new Date(s.dueDate + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    if (!acc[monthKey]) {
      acc[monthKey] = { name: monthName, items: [] };
    }
    acc[monthKey].items.push(s);
    return acc;
  }, {} as Record<string, { name: string; items: ScheduledTransaction[] }>);

  // Estatísticas separadas por tipo
  const todayExpenses = scheduledTransactions.filter(s => s.status === 'pending' && s.dueDate === today && s.transactionType !== 'credit').reduce((sum, s) => sum + s.value, 0);
  const todayIncome = scheduledTransactions.filter(s => s.status === 'pending' && s.dueDate === today && s.transactionType === 'credit').reduce((sum, s) => sum + s.value, 0);
  const overdueTotal = scheduledTransactions.filter(s => s.status === 'pending' && s.dueDate < today && s.transactionType !== 'credit').reduce((sum, s) => sum + s.value, 0);
  const thisMonthExpenses = scheduledTransactions.filter(s => {
    if (s.status !== 'pending' || s.transactionType === 'credit') return false;
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const dueDate = new Date(s.dueDate);
    return dueDate >= monthStart && dueDate <= monthEnd;
  }).reduce((sum, s) => sum + s.value, 0);
  const thisMonthIncome = scheduledTransactions.filter(s => {
    if (s.status !== 'pending' || s.transactionType !== 'credit') return false;
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const dueDate = new Date(s.dueDate);
    return dueDate >= monthStart && dueDate <= monthEnd;
  }).reduce((sum, s) => sum + s.value, 0);

  // Filtrar por tipo de transação (receita/despesa)
  const [filterTransactionType, setFilterTransactionType] = useState<'all' | 'income' | 'expense'>('all');

  const handleAdd = async () => {
    if (!form.description || !form.value || !form.dueDate) {
      showNotification('Preencha descrição, valor e data!', 'error');
      return;
    }

    if (form.paymentType === 'bank' && !form.bank) {
      showNotification('Selecione um banco!', 'error');
      return;
    }

    if (form.paymentType === 'card' && !form.card) {
      showNotification('Selecione um cartão!', 'error');
      return;
    }

    try {
      const totalInstallments = form.type === 'parcel' ? parseInt(form.totalInstallments) : 1;
      
      // Criar lançamentos para cada parcela
      for (let i = 0; i < totalInstallments; i++) {
        const dueDateObj = new Date(form.dueDate);
        dueDateObj.setMonth(dueDateObj.getMonth() + i);
        const calculatedDueDate = dueDateObj.toISOString().split('T')[0];
        
        await addScheduledTransaction({
          description: toUpperCase(form.description) + (totalInstallments > 1 ? ` (${i + 1}/${totalInstallments})` : ''),
          type: form.type,
          transactionType: form.transactionType,
          value: parseFloat(form.value),
          totalInstallments: totalInstallments,
          currentInstallment: i + 1,
          dueDate: calculatedDueDate,
          category: form.category,
          bank: form.paymentType === 'bank' ? form.bank : '',
          card: form.paymentType === 'card' ? form.card : '',
          isPaid: false,
          autoConfirm: form.autoConfirm,
          status: 'pending'
        });
      }

      showNotification(`${totalInstallments} lançamento(s) criado(s)!`, 'success');
      setForm({
        description: '',
        type: 'single',
        transactionType: 'debit',
        value: '',
        totalInstallments: '1',
        dueDate: new Date().toISOString().split('T')[0],
        category: '',
        paymentType: 'bank',
        bank: '',
        card: '',
        autoConfirm: false
      });
    } catch (error: any) {
      console.error('Erro ao criar lançamento:', error);
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        showNotification('Tabela não existe. Crie a tabela "scheduled_transactions" no Supabase.', 'error');
      } else {
        showNotification('Erro ao criar lançamento: ' + (error.message || 'Erro desconhecido'), 'error');
      }
    }
  };

  const handleConfirm = async () => {
    if (!confirmModal) return;

    try {
      await confirmScheduledTransaction(
        confirmModal.scheduled.id,
        parseFloat(confirmModal.confirmedValue),
        confirmModal.confirmedDate
      );
      showNotification('Lançamento confirmado!', 'success');
      setConfirmModal(null);
    } catch (error: any) {
      console.error('Erro ao confirmar:', error);
      showNotification('Erro ao confirmar: ' + (error.message || 'Erro desconhecido'), 'error');
    }
  };

  const handleDelete = async (id: string, description: string) => {
    if (!confirm(`Excluir lançamento "${description}"?`)) return;

    try {
      await deleteScheduledTransaction(id);
      showNotification('Lançamento excluído!', 'success');
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      showNotification('Erro ao excluir: ' + (error.message || 'Erro desconhecido'), 'error');
    }
  };

  const handleEdit = async () => {
    if (!editModal) return;

    try {
      await updateScheduledTransaction(editModal.id, {
        description: editModal.description,
        value: editModal.value,
        dueDate: editModal.dueDate,
        category: editModal.category,
        bank: editModal.bank,
        card: editModal.card
      });
      showNotification('Lançamento atualizado!', 'success');
      setEditModal(null);
    } catch (error: any) {
      console.error('Erro ao atualizar:', error);
      showNotification('Erro ao atualizar: ' + (error.message || 'Erro desconhecido'), 'error');
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'parcel':
        return <span className="badge" style={{ background: '#8b5cf6', color: 'white' }}>📦 Parcelado</span>;
      case 'recurring':
        return <span className="badge" style={{ background: '#f59e0b', color: 'white' }}>🔄 Recorrente</span>;
      default:
        return <span className="badge" style={{ background: '#6b7280', color: 'white' }}>📌 Único</span>;
    }
  };

  const getTransactionTypeBadge = (transactionType: string) => {
    if (transactionType === 'credit') {
      return <span className="badge" style={{ background: '#22c55e', color: 'white' }}>💰 Receita</span>;
    }
    return <span className="badge" style={{ background: '#ef4444', color: 'white' }}>💸 Despesa</span>;
  };

  const getStatusBadge = (dueDate: string) => {
    if (dueDate === today) {
      return <span className="badge" style={{ background: '#ef4444', color: 'white' }}>🔴 Hoje</span>;
    }
    if (dueDate < today) {
      return <span className="badge" style={{ background: '#dc2626', color: 'white' }}>⚠️ Vencido</span>;
    }
    return <span className="badge" style={{ background: '#22c55e', color: 'white' }}>✅ Pendente</span>;
  };

  // Aviso se tabela não existe
  if (!scheduledTransactionsTableExists) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h3>Tabela não configurada</h3>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            A tabela <code>scheduled_transactions</code> não existe no Supabase.
          </p>
          <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '0.5rem', textAlign: 'left', fontSize: '0.85rem' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>Execute este SQL no Supabase SQL Editor:</p>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
{`CREATE TABLE scheduled_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'single',
  value DECIMAL(10,2) NOT NULL,
  total_installments INTEGER DEFAULT 1,
  current_installment INTEGER DEFAULT 1,
  due_date DATE NOT NULL,
  category TEXT,
  bank TEXT,
  card TEXT,
  is_paid BOOLEAN DEFAULT FALSE,
  auto_confirm BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE scheduled_transactions ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Users can manage own scheduled transactions" ON scheduled_transactions
  FOR ALL USING (auth.uid() = user_id);`}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Estatísticas */}
      <div className="dashboard-compact" style={{ marginBottom: '1rem' }}>
        <div className="stat-card red" style={{ cursor: 'pointer' }} onClick={() => setFilterStatus('today')}>
          <div className="stat-icon">🔴</div>
          <div className="stat-content">
            <div className="stat-value">{fmt(todayExpenses)}</div>
            <div className="stat-label">DESPESAS HOJE</div>
          </div>
        </div>
        <div className="stat-card green" style={{ cursor: 'pointer' }} onClick={() => setFilterStatus('today')}>
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">{fmt(todayIncome)}</div>
            <div className="stat-label">RECEITAS HOJE</div>
          </div>
        </div>
        <div className="stat-card orange" style={{ cursor: 'pointer' }} onClick={() => setFilterStatus('overdue')}>
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{fmt(overdueTotal)}</div>
            <div className="stat-label">VENCIDOS</div>
          </div>
        </div>
        <div className="stat-card blue" style={{ cursor: 'pointer' }} onClick={() => setFilterStatus('upcoming')}>
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">{fmt(thisMonthExpenses)}</div>
            <div className="stat-label">DESP. ESTE MÊS</div>
          </div>
        </div>
        <div className="stat-card purple" style={{ cursor: 'pointer' }} onClick={() => setFilterStatus('all')}>
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{filteredScheduled.length}</div>
            <div className="stat-label">LANÇAMENTOS</div>
          </div>
        </div>
      </div>

      {/* Novo Lançamento */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>📅 Novo Lançamento Futuro</h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Descrição *</label>
            <input
              type="text"
              className="form-input uppercase"
              placeholder="EX: FINANCIAMENTO CASA"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              onBlur={e => setForm({ ...form, description: toUpperCase(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Natureza *</label>
            <select
              className="form-select"
              value={form.transactionType}
              onChange={e => setForm({ ...form, transactionType: e.target.value as any })}
              style={{ 
                background: form.transactionType === 'credit' ? '#f0fdf4' : '#fef2f2',
                borderColor: form.transactionType === 'credit' ? '#22c55e' : '#ef4444'
              }}
            >
              <option value="debit">💸 Despesa (Saída)</option>
              <option value="credit">💰 Receita (Entrada)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select
              className="form-select"
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value as any })}
            >
              <option value="single">📌 Único</option>
              <option value="parcel">📦 Parcelado</option>
              <option value="recurring">🔄 Recorrente (Assinatura)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Valor *</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              placeholder="0,00"
              value={form.value}
              onChange={e => setForm({ ...form, value: e.target.value })}
              style={{ 
                color: form.transactionType === 'credit' ? '#22c55e' : '#ef4444',
                fontWeight: 600
              }}
            />
          </div>
          {form.type === 'parcel' && (
            <div className="form-group">
              <label className="form-label">Parcelas</label>
              <input
                type="number"
                min="2"
                max="120"
                className="form-input"
                value={form.totalInstallments}
                onChange={e => setForm({ ...form, totalInstallments: e.target.value })}
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">1º Vencimento *</label>
            <input
              type="date"
              className="form-input"
              value={form.dueDate}
              onChange={e => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <SearchableSelect
              options={categories.map(c => ({ id: c.id, icon: c.icon, name: c.name }))}
              value={form.category}
              onChange={(val) => setForm({ ...form, category: val })}
              placeholder="Buscar categoria..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Pagamento</label>
            <select
              className="form-select"
              value={form.paymentType}
              onChange={e => setForm({ ...form, paymentType: e.target.value as any, bank: '', card: '' })}
            >
              <option value="bank">🏦 Banco/Débito</option>
              <option value="card">💳 Cartão de Crédito</option>
            </select>
          </div>
          {form.paymentType === 'bank' ? (
            <div className="form-group">
              <label className="form-label">Banco *</label>
              <select
                className="form-select"
                value={form.bank}
                onChange={e => setForm({ ...form, bank: e.target.value })}
              >
                <option value="">Selecione</option>
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Cartão *</label>
              <select
                className="form-select"
                value={form.card}
                onChange={e => setForm({ ...form, card: e.target.value })}
              >
                <option value="">Selecione</option>
                {creditCards.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
            <input
              type="checkbox"
              id="autoConfirm"
              checked={form.autoConfirm}
              onChange={e => setForm({ ...form, autoConfirm: e.target.checked })}
            />
            <label htmlFor="autoConfirm" style={{ fontSize: '0.85rem', color: '#6b7280' }}>
              Confirmar automaticamente no vencimento
            </label>
          </div>
          <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={handleAdd}>
            ➕ Adicionar
          </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Buscar lançamento..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
          />
          <select
            className="form-select"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
          >
            <option value="all">Todos</option>
            <option value="today">🔴 Hoje</option>
            <option value="overdue">⚠️ Vencidos</option>
            <option value="upcoming">📅 Futuros</option>
          </select>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Lista de Lançamentos */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>📋 Lançamentos Futuros</h3>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: '#6b7280' }}>
            <span>✅ Confirmar</span>
            <span>✏️ Editar</span>
            <span>🗑️ Excluir</span>
          </div>
        </div>

        {Object.keys(groupedByMonth).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📭</div>
            Nenhum lançamento futuro encontrado
          </div>
        ) : (
          Object.entries(groupedByMonth).map(([monthKey, { name, items }]) => (
            <div key={monthKey} style={{ marginBottom: '1.5rem' }}>
              <div style={{
                background: '#f3f4f6',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                marginBottom: '0.5rem',
                fontWeight: 600,
                textTransform: 'capitalize',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>{name}</span>
                <span>{fmt(items.reduce((sum, s) => sum + s.value, 0))}</span>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Natureza</th>
                      <th>Tipo</th>
                      <th>Banco/Cartão</th>
                      <th>Categoria</th>
                      <th style={{ textAlign: 'right' }}>Valor</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(s => (
                      <tr key={s.id} style={{ 
                        background: s.dueDate < today ? '#fef2f2' : (s.dueDate === today ? '#fff7ed' : 'inherit')
                      }}>
                        <td>{getStatusBadge(s.dueDate)}</td>
                        <td>{fmtDate(s.dueDate)}</td>
                        <td>
                          <strong>{s.description}</strong>
                          {s.type === 'parcel' && (
                            <small style={{ display: 'block', color: '#6b7280' }}>
                              Parcela {s.currentInstallment}/{s.totalInstallments}
                            </small>
                          )}
                        </td>
                        <td>{getTransactionTypeBadge(s.transactionType || 'debit')}</td>
                        <td>{getTypeBadge(s.type)}</td>
                        <td>
                          {s.card ? (
                            <span className="badge card">{getCardIcon(s.card)} {getCardName(s.card)}</span>
                          ) : s.bank ? (
                            <span className="badge bank">{getBankIcon(s.bank)} {getBankName(s.bank)}</span>
                          ) : '-'}
                        </td>
                        <td>
                          {s.category ? (
                            <span className="badge category">{getCategoryIcon(s.category)} {getCategoryName(s.category)}</span>
                          ) : '-'}
                        </td>
                        <td style={{ 
                          textAlign: 'right', 
                          fontWeight: 600, 
                          color: s.transactionType === 'credit' ? '#22c55e' : '#ef4444'
                        }}>
                          {s.transactionType === 'credit' ? '+' : '-'}{fmt(s.value)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'nowrap' }}>
                            <button
                              className="btn btn-sm"
                              style={{ 
                                background: s.dueDate <= today ? '#22c55e' : '#3b82f6', 
                                color: 'white',
                                minWidth: '36px',
                                padding: '0.5rem'
                              }}
                              onClick={() => setConfirmModal({
                                scheduled: s,
                                confirmedValue: s.value.toString(),
                                confirmedDate: s.dueDate <= today ? today : s.dueDate
                              })}
                              title={s.dueDate <= today ? "Confirmar pagamento (vencido/hoje)" : "Confirmar pagamento antecipado"}
                            >
                              ✅
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ 
                                background: '#f59e0b', 
                                color: 'white',
                                minWidth: '36px',
                                padding: '0.5rem'
                              }}
                              onClick={() => setEditModal(s)}
                              title="Editar lançamento"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ 
                                background: '#ef4444', 
                                color: 'white',
                                minWidth: '36px',
                                padding: '0.5rem'
                              }}
                              onClick={() => handleDelete(s.id, s.description)}
                              title="Excluir lançamento"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Confirmação */}
      {confirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '0.75rem',
            maxWidth: '450px',
            width: '100%'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>✅ Confirmar Lançamento</h3>
            
            {/* Status do lançamento */}
            {confirmModal.scheduled.dueDate > today && (
              <div style={{ 
                background: '#fef3c7', 
                border: '1px solid #f59e0b',
                padding: '0.75rem', 
                borderRadius: '0.5rem', 
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                ⚠️ <strong>Atenção:</strong> Este lançamento ainda não venceu. 
                Você está confirmando antecipadamente.
              </div>
            )}
            
            {confirmModal.scheduled.dueDate < today && (
              <div style={{ 
                background: '#fee2e2', 
                border: '1px solid #ef4444',
                padding: '0.75rem', 
                borderRadius: '0.5rem', 
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                ⚠️ <strong>Atenção:</strong> Este lançamento está vencido há {Math.ceil((new Date(today).getTime() - new Date(confirmModal.scheduled.dueDate).getTime()) / (1000 * 60 * 60 * 24))} dia(s).
              </div>
            )}

            <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem 0' }}><strong>{confirmModal.scheduled.description}</strong></p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
                Vencimento: {fmtDate(confirmModal.scheduled.dueDate)}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.1rem', fontWeight: 600, color: confirmModal.scheduled.transactionType === 'credit' ? '#22c55e' : '#ef4444' }}>
                Valor: {confirmModal.scheduled.transactionType === 'credit' ? '+' : '-'}{fmt(confirmModal.scheduled.value)}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Valor Confirmado (R$)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={confirmModal.confirmedValue}
                onChange={e => setConfirmModal({ ...confirmModal, confirmedValue: e.target.value })}
                style={{ fontSize: '1.1rem', fontWeight: 600 }}
              />
              <small style={{ color: '#6b7280' }}>
                Ajuste o valor se necessário (ex: juros, multas, descontos)
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Data do Pagamento</label>
              <input
                type="date"
                className="form-input"
                value={confirmModal.confirmedDate}
                onChange={e => setConfirmModal({ ...confirmModal, confirmedDate: e.target.value })}
              />
            </div>

            <div style={{ 
              background: '#f0fdf4', 
              border: '1px solid #22c55e', 
              padding: '0.75rem', 
              borderRadius: '0.5rem', 
              marginBottom: '1rem',
              fontSize: '0.85rem'
            }}>
              💡 Ao confirmar, este lançamento será movido para a aba <strong>"Transações"</strong> e o saldo será atualizado.
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                className="btn" 
                style={{ background: '#22c55e', color: 'white', flex: 1 }} 
                onClick={handleConfirm}
              >
                ✅ Confirmar e Mover para Transações
              </button>
              <button
                className="btn"
                style={{ background: '#6b7280', color: 'white' }}
                onClick={() => setConfirmModal(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '0.75rem',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>✏️ Editar Lançamento</h3>

            <div className="form-group">
              <label className="form-label">Descrição</label>
              <input
                type="text"
                className="form-input uppercase"
                value={editModal.description}
                onChange={e => setEditModal({ ...editModal, description: toUpperCase(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={editModal.value}
                onChange={e => setEditModal({ ...editModal, value: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Data de Vencimento</label>
              <input
                type="date"
                className="form-input"
                value={editModal.dueDate}
                onChange={e => setEditModal({ ...editModal, dueDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Categoria</label>
              <SearchableSelect
                options={categories.map(c => ({ id: c.id, icon: c.icon, name: c.name }))}
                value={editModal.category || ''}
                onChange={(val) => setEditModal({ ...editModal, category: val })}
                placeholder="Buscar categoria..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Banco</label>
              <select
                className="form-select"
                value={editModal.bank || ''}
                onChange={e => setEditModal({ ...editModal, bank: e.target.value, card: '' })}
              >
                <option value="">Selecione (opcional)</option>
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Cartão de Crédito</label>
              <select
                className="form-select"
                value={editModal.card || ''}
                onChange={e => setEditModal({ ...editModal, card: e.target.value, bank: '' })}
              >
                <option value="">Selecione (opcional)</option>
                {creditCards.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={handleEdit}>
                💾 Salvar Alterações
              </button>
              <button
                className="btn"
                style={{ background: '#6b7280', color: 'white' }}
                onClick={() => setEditModal(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
