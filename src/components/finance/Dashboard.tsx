'use client';

import React, { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card } from '@/components/ui/card';

interface CategoryReport {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  type: 'income' | 'expense' | 'card';
  transactions: any[];
  total: number;
}

export function Dashboard() {
  const { transactions, banks, creditCardTransactions, categories, creditCards, getBankBalance, getBankName, getBankIcon, getCategoryName, getCategoryIcon, getCardName, getCardIcon } = useFinance();
  const [filterBank, setFilterBank] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('thisMonth');
  const [categoryReport, setCategoryReport] = useState<CategoryReport | null>(null);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmtDate = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '';

  const thisMonthStr = thisMonthStart.toISOString().split('T')[0];
  const nowStr = now.toISOString().split('T')[0];
  const lastMonthStartStr = lastMonthStart.toISOString().split('T')[0];
  const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];

  // Filter transactions
  const monthTx = transactions.filter(t => {
    if (filterBank && t.bank !== filterBank) return false;
    if (filterPeriod === 'thisMonth') return t.date >= thisMonthStr && t.date <= nowStr;
    if (filterPeriod === 'lastMonth') return t.date >= lastMonthStartStr && t.date <= lastMonthEndStr;
    return true;
  });

  // Encontrar ID da categoria PAGAMENTO CARTÃO
  // Inclui tanto o UUID da categoria quanto a string fixa usada no payCardInvoice
  const pagamentoCartaoCategoryIds = [
    ...categories
      .filter(c => c.name.toUpperCase() === 'PAGAMENTO CARTÃO')
      .map(c => c.id),
    'pagamento_cartao'  // String fixa usada em payCardInvoice
  ];

  const income = monthTx.filter(t => t.type === 'credit').reduce((s, t) => s + t.value, 0);
  const expenses = monthTx.filter(t => t.type === 'debit' && !pagamentoCartaoCategoryIds.includes(t.category)).reduce((s, t) => s + t.value, 0);
  const cardPayments = monthTx.filter(t => pagamentoCartaoCategoryIds.includes(t.category)).reduce((s, t) => s + t.value, 0);
  
  // Filter credit card transactions by period
  const ccFiltered = creditCardTransactions.filter(t => {
    if (filterPeriod === 'thisMonth') return t.date >= thisMonthStr && t.date <= nowStr;
    if (filterPeriod === 'lastMonth') return t.date >= lastMonthStartStr && t.date <= lastMonthEndStr;
    return true;
  });
  
  const cardSpent = ccFiltered.filter(t => !t.isPayment && t.value > 0).reduce((s, t) => s + t.value, 0);
  
  const ccLastMonth = creditCardTransactions.filter(t => t.date >= lastMonthStartStr && t.date <= lastMonthEndStr);
  const previousMonthBalance = Math.max(0, ccLastMonth.reduce((s, t) => s + t.value, 0));
  
  const totalCard = cardSpent + previousMonthBalance;
  const totalBalance = banks.reduce((s, b) => s + getBankBalance(b.id), 0);
  const cashFlow = income - expenses - cardPayments;

  // Category breakdowns
  const expensesByCategory: Record<string, number> = {};
  monthTx.filter(t => t.type === 'debit' && !pagamentoCartaoCategoryIds.includes(t.category)).forEach(t => {
    expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.value;
  });

  const incomeByCategory: Record<string, number> = {};
  monthTx.filter(t => t.type === 'credit').forEach(t => {
    incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.value;
  });

  const cardByCategory: Record<string, number> = {};
  ccFiltered.filter(t => !t.isPayment && t.value > 0).forEach(t => {
    cardByCategory[t.category] = (cardByCategory[t.category] || 0) + t.value;
  });

  // Cálculo para gráfico Receitas x Despesas
  const totalExpenses = expenses + cardSpent;
  const revenuePercent = income > 0 ? ((income / (income + totalExpenses)) * 100) : 0;
  const expensePercent = totalExpenses > 0 ? ((totalExpenses / (income + totalExpenses)) * 100) : 0;
  const balance = income - totalExpenses;
  const savingsRate = income > 0 ? ((balance / income) * 100) : 0;

  // Função para abrir relatório de categoria
  const openCategoryReport = (categoryId: string, type: 'income' | 'expense' | 'card' | 'total') => {
    let filteredTx: any[] = [];
    let total = 0;

    if (type === 'income') {
      // Receitas - buscar nas transações normais
      filteredTx = monthTx
        .filter(t => t.type === 'credit' && t.category === categoryId)
        .map(t => ({ 
          date: t.date, 
          description: t.description, 
          bank: t.bank, 
          card: null,
          value: t.value 
        }));
      total = filteredTx.reduce((s, t) => s + t.value, 0);
    } else if (type === 'expense') {
      // Despesas - buscar nas transações normais (débito)
      filteredTx = monthTx
        .filter(t => t.type === 'debit' && t.category === categoryId)
        .map(t => ({ 
          date: t.date, 
          description: t.description, 
          bank: t.bank, 
          card: null,
          value: t.value 
        }));
      total = filteredTx.reduce((s, t) => s + t.value, 0);
    } else if (type === 'card') {
      // Cartão - buscar nas transações de cartão
      filteredTx = ccFiltered
        .filter(t => !t.isPayment && t.value > 0 && t.category === categoryId)
        .map(t => ({ 
          date: t.date, 
          description: t.description, 
          bank: null, 
          card: t.card,
          value: t.value 
        }));
      total = filteredTx.reduce((s, t) => s + t.value, 0);
    } else if (type === 'total') {
      // Total Despesas - buscar em ambas as fontes
      const bankTx = monthTx
        .filter(t => t.type === 'debit' && t.category === categoryId)
        .map(t => ({ 
          date: t.date, 
          description: t.description, 
          bank: t.bank, 
          card: null,
          value: t.value 
        }));
      const cardTx = ccFiltered
        .filter(t => !t.isPayment && t.value > 0 && t.category === categoryId)
        .map(t => ({ 
          date: t.date, 
          description: t.description, 
          bank: null, 
          card: t.card,
          value: t.value 
        }));
      filteredTx = [...bankTx, ...cardTx];
      total = filteredTx.reduce((s, t) => s + t.value, 0);
    }

    console.log('Category Report:', { categoryId, type, count: filteredTx.length, total });
    
    setCategoryReport({
      categoryId,
      categoryName: getCategoryName(categoryId),
      categoryIcon: getCategoryIcon(categoryId),
      type: type === 'total' ? 'expense' : type,
      transactions: filteredTx.sort((a, b) => b.date.localeCompare(a.date)),
      total
    });
  };

  const renderPieChart = (data: Record<string, number>, title: string, type: 'income' | 'expense' | 'card' | 'total') => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    
    if (entries.length === 0) {
      return (
        <div className="chart-container">
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>{title}</h3>
          <div className="pie-chart" style={{ background: '#e5e7eb' }}></div>
          <div className="pie-legend"><small style={{ color: '#6b7280' }}>Sem dados</small></div>
        </div>
      );
    }

    const gradient = entries.map(([k, v], i) => {
      const percent = (v / total) * 100;
      return `${colors[i % colors.length]} 0 ${percent}%`;
    }).join(', ');

    return (
      <div className="chart-container">
        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>{title}</h3>
        <div className="pie-chart" style={{ background: `conic-gradient(${gradient})` }}></div>
        <div className="pie-legend" style={{ marginTop: '1rem' }}>
          {entries.map(([cat, value], i) => (
            <div 
              key={cat} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px', 
                fontSize: '0.8rem',
                cursor: 'pointer',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                transition: 'background 0.2s'
              }}
              onClick={() => openCategoryReport(cat, type)}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              title="Clique para ver detalhes"
            >
              <div style={{ width: 12, height: 12, background: colors[i % colors.length], borderRadius: 2 }}></div>
              <span>{getCategoryIcon(cat)} {getCategoryName(cat)}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{fmt(value)}</span>
            </div>
          ))}
        </div>
        <small style={{ color: '#9ca3af', fontSize: '0.7rem', marginTop: '0.5rem', display: 'block', textAlign: 'center' }}>
          💡 Clique na categoria para ver detalhes
        </small>
      </div>
    );
  };

  // Period label
  const getPeriodLabel = () => {
    if (filterPeriod === 'thisMonth') return 'Este Mês';
    if (filterPeriod === 'lastMonth') return 'Mês Anterior';
    return 'Histórico';
  };

  return (
    <div>
      {/* Filters */}
      <div className="card">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Banco</label>
            <select className="form-select" value={filterBank} onChange={e => setFilterBank(e.target.value)}>
              <option value="">Todos</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Período</label>
            <select className="form-select" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
              <option value="">Histórico</option>
              <option value="thisMonth">Este Mês</option>
              <option value="lastMonth">Mês Anterior</option>
            </select>
          </div>
          <div className="form-group">
            <button className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Atualizar 🔄</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="dashboard-compact">
        <div className="stat-card green">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">{fmt(income)}</div>
            <div className="stat-label">RECEITAS</div>
          </div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">💸</div>
          <div className="stat-content">
            <div className="stat-value">{fmt(expenses)}</div>
            <div className="stat-label">DESPESAS</div>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">💳</div>
          <div className="stat-content">
            <div className="stat-value">{fmt(cardSpent)}</div>
            <div className="stat-label">CARTÃO ESTE MÊS</div>
          </div>
        </div>
        {previousMonthBalance > 0 && (
          <div className="stat-card orange">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-value">{fmt(previousMonthBalance)}</div>
              <div className="stat-label">SALDO MÊS PASSADO</div>
            </div>
          </div>
        )}
        <div className="stat-card pink">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{fmt(totalCard)}</div>
            <div className="stat-label">TOTAL CARTÃO</div>
          </div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon">🏦</div>
          <div className="stat-content">
            <div className="stat-value">{fmt(cardPayments)}</div>
            <div className="stat-label">PAGAMENTOS CARTÃO</div>
          </div>
        </div>
        <div className="stat-card teal">
          <div className="stat-icon">🏦</div>
          <div className="stat-content">
            <div className="stat-value">{fmt(totalBalance)}</div>
            <div className="stat-label">SALDO ATUAL</div>
          </div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-value">{fmt(cashFlow)}</div>
            <div className="stat-label">FLUXO DE CAIXA</div>
          </div>
        </div>
      </div>

      {/* Gráfico Receitas x Despesas */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>📊 Receitas x Despesas</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Gráfico de pizza */}
          <div style={{ position: 'relative' }}>
            <div 
              style={{ 
                width: 200, 
                height: 200, 
                borderRadius: '50%', 
                background: `conic-gradient(#22c55e 0% ${revenuePercent}%, #ef4444 ${revenuePercent}% 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ 
                width: 120, 
                height: 120, 
                borderRadius: '50%', 
                background: 'white', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Saldo</div>
                <div style={{ 
                  fontSize: '1rem', 
                  fontWeight: 'bold', 
                  color: balance >= 0 ? '#22c55e' : '#ef4444' 
                }}>
                  {fmt(balance)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  ({savingsRate >= 0 ? '+' : ''}{savingsRate.toFixed(1)}%)
                </div>
              </div>
            </div>
          </div>
          
          {/* Legenda e percentuais */}
          <div style={{ minWidth: 200 }}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 16, height: 16, background: '#22c55e', borderRadius: 4 }}></div>
              <div>
                <div style={{ fontWeight: 600, color: '#22c55e' }}>💰 Receitas</div>
                <div style={{ fontSize: '0.9rem' }}>{fmt(income)} ({revenuePercent.toFixed(1)}%)</div>
              </div>
            </div>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 16, height: 16, background: '#ef4444', borderRadius: 4 }}></div>
              <div>
                <div style={{ fontWeight: 600, color: '#ef4444' }}>💸 Despesas</div>
                <div style={{ fontSize: '0.9rem' }}>{fmt(totalExpenses)} ({expensePercent.toFixed(1)}%)</div>
              </div>
            </div>
            <div style={{ 
              padding: '0.75rem', 
              background: balance >= 0 ? '#f0fdf4' : '#fef2f2', 
              borderRadius: '0.5rem',
              border: `1px solid ${balance >= 0 ? '#86efac' : '#fca5a5'}`
            }}>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Taxa de Economia</div>
              <div style={{ 
                fontSize: '1.25rem', 
                fontWeight: 'bold', 
                color: balance >= 0 ? '#22c55e' : '#ef4444' 
              }}>
                {savingsRate >= 0 ? '📈 ' : '📉 '}{savingsRate.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
        
        {/* Barra visual */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', height: 30, borderRadius: 8, overflow: 'hidden', background: '#e5e7eb' }}>
            <div 
              style={{ 
                width: `${revenuePercent}%`, 
                background: '#22c55e', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 600,
                minWidth: revenuePercent > 10 ? 60 : 0
              }}
            >
              {revenuePercent > 10 && `${revenuePercent.toFixed(0)}%`}
            </div>
            <div 
              style={{ 
                width: `${expensePercent}%`, 
                background: '#ef4444', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 600,
                minWidth: expensePercent > 10 ? 60 : 0
              }}
            >
              {expensePercent > 10 && `${expensePercent.toFixed(0)}%`}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            <span>💰 Receitas</span>
            <span>💸 Despesas</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {renderPieChart(incomeByCategory, 'Receitas', 'income')}
        {renderPieChart(expensesByCategory, 'Despesas', 'expense')}
        {renderPieChart(cardByCategory, 'Cartão', 'card')}
        {renderPieChart({ ...expensesByCategory, ...cardByCategory }, 'Total Desp.', 'total')}
      </div>

      {/* Category Report Modal */}
      {categoryReport && (
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
        }} onClick={() => setCategoryReport(null)}>
          <div style={{
            background: 'white',
            borderRadius: '0.75rem',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ 
              padding: '1rem 1.5rem', 
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {categoryReport.categoryIcon} {categoryReport.categoryName}
                </h3>
                <small style={{ color: '#6b7280' }}>
                  {getPeriodLabel()} • {categoryReport.type === 'income' ? 'Receitas' : categoryReport.type === 'card' ? 'Cartão' : 'Despesas'}
                </small>
              </div>
              <button 
                onClick={() => setCategoryReport(null)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '1.5rem', 
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Total */}
            <div style={{ 
              padding: '1rem 1.5rem', 
              background: categoryReport.type === 'income' ? '#f0fdf4' : '#fef2f2',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Total</div>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: categoryReport.type === 'income' ? '#22c55e' : '#ef4444' 
              }}>
                {fmt(categoryReport.total)}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                {categoryReport.transactions.length} lançamento{categoryReport.transactions.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            {/* Transactions List */}
            <div style={{ overflow: 'auto', flex: 1 }}>
              {categoryReport.transactions.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  Nenhum lançamento encontrado
                </div>
              ) : (
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>{categoryReport.type === 'card' ? 'Cartão' : 'Banco'}</th>
                      <th style={{ textAlign: 'right' }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryReport.transactions.map((t, i) => (
                      <tr key={i}>
                        <td>{fmtDate(t.date)}</td>
                        <td>{t.description}</td>
                        <td>
                          {t.card ? (
                            <span className="badge card">{getCardIcon(t.card)} {getCardName(t.card)}</span>
                          ) : (
                            <span className="badge bank">{getBankIcon(t.bank)} {getBankName(t.bank)}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {fmt(t.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
