'use client';

import React, { useState, useRef } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { EMOJI_LIST, toUpperCase } from '@/lib/types';
import { EditCreditCardTransactionModal } from './Modals';
import { SearchableSelect } from './SearchableSelect';

export function CreditCards({ showNotification }: { showNotification: (msg: string, type: 'success' | 'error') => void }) {
  const { creditCards, banks, categories, creditCardTransactions, addCreditCard, updateCreditCard, deleteCreditCard, getCardInvoice, getCardTotalDebt, addCreditCardTransaction, updateCreditCardTransaction, deleteCreditCardTransaction, payCardInvoice, getBankName, getCategoryName, getCategoryIcon } = useFinance();
  
  const [cardForm, setCardForm] = useState({ name: '', bank: '', limit: '', icon: '💳' });
  const [purchaseForm, setPurchaseForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', card: '', category: '', value: '' });
  const [filters, setFilters] = useState({ card: '', date: '' });
  const [showEmoji, setShowEmoji] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);
  const descriptionRef = useRef<HTMLInputElement>(null);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmtDate = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '';

  const now = new Date();
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const filteredCcTx = creditCardTransactions.filter(t => {
    if (filters.card && t.card !== filters.card) return false;
    if (filters.date === 'thisMonth' && !t.date.startsWith(thisMonthStr)) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date)); // Ordena por data descendente (futuras primeiro)

  // Calcular total filtrado
  const filteredTotal = filteredCcTx.reduce((sum, t) => sum + t.value, 0);

  const handleAddCard = async () => {
    if (!cardForm.name || !cardForm.bank || !cardForm.limit) {
      showNotification('Preencha todos os campos!', 'error');
      return;
    }
    await addCreditCard({ name: toUpperCase(cardForm.name), bank: cardForm.bank, limit: parseFloat(cardForm.limit), icon: cardForm.icon });
    showNotification('Cartão adicionado!', 'success');
    setCardForm({ name: '', bank: '', limit: '', icon: '💳' });
  };

  const handleAddPurchase = async () => {
    if (!purchaseForm.description || !purchaseForm.card || !purchaseForm.category || !purchaseForm.value) {
      showNotification('Preencha todos os campos!', 'error');
      return;
    }
    await addCreditCardTransaction({ 
      ...purchaseForm, 
      description: toUpperCase(purchaseForm.description),
      value: parseFloat(purchaseForm.value), 
      isPayment: false 
    });
    showNotification('Compra adicionada!', 'success');
    // Mantém data, cartão e categoria - apaga descrição e valor
    setPurchaseForm({ 
      date: purchaseForm.date, 
      description: '', 
      card: purchaseForm.card, 
      category: purchaseForm.category, 
      value: '' 
    });
    // Foca no campo descrição para próxima digitação
    descriptionRef.current?.focus();
  };

  const handleDeletePurchase = async (id: string) => {
    console.log('Tentando excluir transação ID:', id);
    
    if (confirm('Excluir esta transação do cartão?')) {
      try {
        console.log('Confirmado. Chamando deleteCreditCardTransaction...');
        await deleteCreditCardTransaction(id);
        console.log('Exclusão realizada com sucesso!');
        showNotification('Transação excluída com sucesso!', 'success');
      } catch (error: any) {
        console.error('Erro ao excluir transação:', error);
        showNotification(`Erro ao excluir: ${error?.message || 'Erro desconhecido'}`, 'error');
      }
    } else {
      console.log('Exclusão cancelada pelo usuário');
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (confirm('Excluir cartão?')) {
      await deleteCreditCard(id);
      showNotification('Excluído!', 'success');
    }
  };

  return (
    <div>
      {/* New Card Form */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Cartões</h3>
        <div className="form-grid" style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
          <div className="form-group">
            <label className="form-label">Nome</label>
            <input 
              type="text" 
              className="form-input uppercase" 
              placeholder="NOME DO CARTÃO" 
              value={cardForm.name} 
              onChange={e => setCardForm({...cardForm, name: e.target.value})} 
              onBlur={e => setCardForm({...cardForm, name: toUpperCase(e.target.value)})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Banco</label>
            <select className="form-select" value={cardForm.bank} onChange={e => setCardForm({...cardForm, bank: e.target.value})}>
              <option value="">Selecione</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Limite</label>
            <input type="number" step="0.01" className="form-input" placeholder="0,00" value={cardForm.limit} onChange={e => setCardForm({...cardForm, limit: e.target.value})} />
          </div>
          <button className="btn btn-success" style={{ marginTop: '1.5rem' }} onClick={handleAddCard}>Adicionar</button>
        </div>

        {/* New Purchase Form */}
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Data</label>
            <input type="date" className="form-input" value={purchaseForm.date} onChange={e => setPurchaseForm({...purchaseForm, date: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Desc</label>
            <input 
              ref={descriptionRef}
              type="text" 
              className="form-input uppercase" 
              placeholder="DESCRIÇÃO" 
              value={purchaseForm.description} 
              onChange={e => setPurchaseForm({...purchaseForm, description: e.target.value})} 
              onBlur={e => setPurchaseForm({...purchaseForm, description: toUpperCase(e.target.value)})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Cartão</label>
            <select className="form-select" value={purchaseForm.card} onChange={e => setPurchaseForm({...purchaseForm, card: e.target.value})}>
              <option value="">Selecione</option>
              {creditCards.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cat</label>
            <SearchableSelect
              options={categories.filter(c => c.id !== 'pagamento_cartao').map(c => ({ id: c.id, icon: c.icon, name: c.name }))}
              value={purchaseForm.category}
              onChange={(val) => setPurchaseForm({...purchaseForm, category: val})}
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
              value={purchaseForm.value} 
              onChange={e => setPurchaseForm({...purchaseForm, value: e.target.value})} 
              onKeyDown={e => { if (e.key === 'Enter') handleAddPurchase(); }}
            />
          </div>
          <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={handleAddPurchase}>Adicionar</button>
        </div>
      </div>

      {/* Filters & List */}
      <div className="card">
        <div className="filter-bar">
          <select className="form-select" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})}>
            <option value="">Todos</option>
            <option value="thisMonth">Este Mês</option>
          </select>
          <select className="form-select" value={filters.card} onChange={e => setFilters({...filters, card: e.target.value})}>
            <option value="">Cartões</option>
            {creditCards.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ card: '', date: 'thisMonth' })}>Limpar</button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Ações</th>
                <th>Data</th>
                <th>Desc</th>
                <th>Cartão</th>
                <th>Cat</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {filteredCcTx.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Nenhuma compra</td></tr>
              ) : filteredCcTx.map(t => {
                const card = creditCards.find(c => c.id === t.card);
                const isPayment = t.isPayment || t.value < 0;
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => { setEditTx(t); setShowEdit(true); }}>✏️</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeletePurchase(t.id)}>🗑️</button>
                      </div>
                    </td>
                    <td>{fmtDate(t.date)}</td>
                    <td>{t.description}</td>
                    <td><span className="badge card">{card?.icon || '💳'} {card?.name || '?'}</span></td>
                    <td><span className="badge category">{getCategoryIcon(t.category)} {getCategoryName(t.category)}</span></td>
                    <td className={`text-right ${isPayment ? 'value-credit' : 'value-debit'}`}>{fmt(Math.abs(t.value))}</td>
                  </tr>
                );
              })}
              {/* Total Row */}
              <tr style={{ background: '#f3f4f6', fontWeight: 'bold' }}>
                <td colSpan={5} style={{ textAlign: 'right', paddingRight: '1rem' }}>
                  Total Filtrado:
                </td>
                <td className="text-right value-debit">{fmt(filteredTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="cards-grid">
        {creditCards.map(c => {
          const invoice = getCardInvoice(c.id);
          const totalDebt = getCardTotalDebt(c.id);
          const available = c.limit - totalDebt;
          return (
            <div key={c.id} className="card-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '2rem' }}>{c.icon}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#4b5563' }}>🏦 {getBankName(c.bank)}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                <div>Fatura: <strong>{fmt(invoice)}</strong></div>
                <div>Limite: <strong>{fmt(c.limit)}</strong></div>
                <div>Disponível: <strong style={{ color: available < 0 ? '#ef4444' : '#10b981' }}>{fmt(available)}</strong></div>
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteCard(c.id)}>Excluir</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      <EditCreditCardTransactionModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        transaction={editTx}
        creditCards={creditCards}
        categories={categories}
        onSave={updateCreditCardTransaction}
        showNotification={showNotification}
      />
    </div>
  );
}
