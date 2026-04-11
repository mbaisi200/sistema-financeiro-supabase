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
  const { transactions, banks, creditCardTransactions, categories, creditCards, scheduledTransactions, getBankBalance, getBankName, getBankIcon, getCategoryName, getCategoryIcon, getCardName, getCardIcon, getCardTotalDebt } = useFinance();
  const [filterBank, setFilterBank] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [categoryReport, setCategoryReport] = useState<CategoryReport | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(true);

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

  // Helper para obter o range de datas do período selecionado
  const getPeriodRange = () => {
    if (filterPeriod === 'thisMonth') return { start: thisMonthStr, end: nowStr };
    if (filterPeriod === 'lastMonth') return { start: lastMonthStartStr, end: lastMonthEndStr };
    if (filterPeriod === 'custom' && customStartDate && customEndDate) return { start: customStartDate, end: customEndDate };
    return null; // Histórico completo
  };

  const periodRange = getPeriodRange();

  const isInPeriod = (dateStr: string) => {
    if (!periodRange) return true;
    return dateStr >= periodRange.start && dateStr <= periodRange.end;
  };

  // Filter transactions
  const monthTx = transactions.filter(t => {
    if (filterBank && t.bank !== filterBank) return false;
    return isInPeriod(t.date);
  });

  // ========================================
  // FILTRAR LANÇAMENTOS FUTUROS/AGENDADOS
  // ========================================
  // Inclui lançamentos pendentes do MÊS COMPLETO (incluindo dias futuros)
  // ========================================
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  // Data final para agendados (para este mês usa mês completo, para custom usa a data selecionada)
  const scheduledEnd = filterPeriod === 'thisMonth'
    ? thisMonthEnd
    : (filterPeriod === 'custom' && customEndDate ? customEndDate : (filterPeriod === 'lastMonth' ? lastMonthEndStr : null));

  // Lançamentos futuros do período
  const monthScheduled = scheduledTransactions.filter(s => {
    if (s.status !== 'pending') return false;
    if (!periodRange) return true;
    const start = periodRange.start;
    const end = filterPeriod === 'thisMonth' ? thisMonthEnd : periodRange.end;
    return s.dueDate >= start && s.dueDate <= end;
  });

  // Encontrar ID da categoria PAGAMENTO CARTÃO (precisa ser definido ANTES dos filtros agendados)
  const pagamentoCartaoCategoryIds = [
    ...categories
      .filter(c => c.name.toUpperCase() === 'PAGAMENTO CARTÃO')
      .map(c => c.id),
    'pagamento_cartao'
  ];

  // Separar lançamentos agendados por tipo
  // Despesas: transactionType === 'debit' (ou não é credit) com banco definido, SEM cartão (evita dupla contagem)
  // Receitas: transactionType === 'credit' com banco definido
  // Cartão: tem card definido (independente de ter banco, mas NÃO é pagamento de fatura)
  // Pagamento Cartão: transactionType !== 'credit' com banco E categoria pagamento_cartao
  const scheduledDebitExpenses = monthScheduled.filter(s => {
    // Despesa em débito: não é receita, tem banco, NÃO tem cartão, e NÃO é pagamento de cartão
    return s.transactionType !== 'credit'
      && s.bank && s.bank.trim() !== ''
      && !(s.card && s.card.trim() !== '')
      && !pagamentoCartaoCategoryIds.includes(s.category);
  });
  const scheduledCreditIncome = monthScheduled.filter(s => {
    // Receita: é credit e tem banco
    return s.transactionType === 'credit' && s.bank && s.bank.trim() !== '';
  });
  const scheduledCardExpenses = monthScheduled.filter(s => {
    // Gasto no cartão: tem cartão definido (independente de ter banco ou não)
    // Mas NÃO é pagamento de fatura
    return s.card && s.card.trim() !== ''
      && !pagamentoCartaoCategoryIds.includes(s.category);
  });
  const scheduledCardPayments = monthScheduled.filter(s => {
    // Pagamento de fatura agendado: não é receita, tem banco, e categoria é pagamento_cartao
    return s.transactionType !== 'credit'
      && s.bank && s.bank.trim() !== ''
      && pagamentoCartaoCategoryIds.includes(s.category);
  });

  // Debug: mostrar quantidade de lançamentos encontrados
  const scheduledDebug = {
    total: monthScheduled.length,
    debitos: scheduledDebitExpenses.length,
    creditos: scheduledCreditIncome.length,
    cartoes: scheduledCardExpenses.length,
    pagamentosCartao: scheduledCardPayments.length
  };
  console.log('Lançamentos agendados:', scheduledDebug);

  // Valores de lançamentos agendados
  const scheduledDebitExpensesTotal = scheduledDebitExpenses.reduce((s, t) => s + t.value, 0);
  const scheduledCreditIncomeTotal = scheduledCreditIncome.reduce((s, t) => s + t.value, 0);
  const scheduledCardExpensesTotal = scheduledCardExpenses.reduce((s, t) => s + t.value, 0);
  const scheduledCardPaymentsTotal = scheduledCardPayments.reduce((s, t) => s + t.value, 0);

  // ========================================
  // RECEITAS E DESPESAS (INCLUINDO LANÇAMENTOS AGENDADOS)
  // ========================================
  const income = monthTx.filter(t => t.type === 'credit').reduce((s, t) => s + t.value, 0);
  const expenses = monthTx.filter(t => t.type === 'debit' && !pagamentoCartaoCategoryIds.includes(t.category)).reduce((s, t) => s + t.value, 0);
  const cardPayments = monthTx.filter(t => pagamentoCartaoCategoryIds.includes(t.category)).reduce((s, t) => s + t.value, 0);

  // Totais INCLUINDO lançamentos agendados
  const totalIncomeWithScheduled = income + scheduledCreditIncomeTotal;
  const totalExpensesWithScheduled = expenses + scheduledDebitExpensesTotal;
  // Pagamentos de cartão INCLUINDO agendados
  const totalCardPaymentsWithScheduled = cardPayments + scheduledCardPaymentsTotal;
  
  // Filter credit card transactions by period
  const ccFiltered = creditCardTransactions.filter(t => {
    return isInPeriod(t.date);
  });

  // ========================================
  // CÁLCULOS DO CARTÃO DE CRÉDITO (SIMPLIFICADO)
  // ========================================
  // cardSpent: gastos no cartão DURANTE O PERÍODO (para gráficos)
  // cardBalance: saldo REAL do cartão (gastos - pagamentos, todo histórico)
  // ========================================

  // Gastos no cartão durante o período filtrado
  const cardSpent = ccFiltered.filter(t => !t.isPayment && t.value > 0).reduce((s, t) => s + t.value, 0);

  // Gastos no cartão INCLUINDO lançamentos agendados
  const cardSpentWithScheduled = cardSpent + scheduledCardExpensesTotal;
  
  // Saldo REAL de cada cartão (gastos - pagamentos de TODO o histórico)
  const cardBalances = creditCards.map(card => ({
    id: card.id,
    name: card.name,
    balance: getCardTotalDebt(card.id) // esta função já soma tudo (gastos positivos, pagamentos negativos)
  }));
  
  // Saldo total de todos os cartões
  const totalCardBalance = cardBalances.reduce((s, c) => s + c.balance, 0);
  
  // ========================================
  // SALDO ATUAL (CORRIGIDO)
  // ========================================
  // Soma o saldo de TODAS as contas bancárias
  // Fórmula: saldoInicial + créditos - débitos de TODAS as transações
  // ========================================
  const totalBalance = banks.reduce((s, b) => s + getBankBalance(b.id), 0);
  
  // ========================================
  // FLUXO DE CAIXA DO PERÍODO (CORRIGIDO)
  // ========================================
  // Mostra o quanto entrou vs saiu do banco no período
  // Fórmula: Receitas - Despesas em débito - Pagamentos de cartão
  // INCLUINDO lançamentos agendados para consistência com outras métricas
  // ========================================
  const cashFlow = totalIncomeWithScheduled - totalExpensesWithScheduled - totalCardPaymentsWithScheduled;

  // Category breakdowns (INCLUINDO lançamentos agendados)
  const expensesByCategory: Record<string, number> = {};
  monthTx.filter(t => t.type === 'debit' && !pagamentoCartaoCategoryIds.includes(t.category)).forEach(t => {
    expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.value;
  });
  // Adicionar despesas agendadas por categoria
  scheduledDebitExpenses.forEach(t => {
    if (t.category && !pagamentoCartaoCategoryIds.includes(t.category)) {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.value;
    }
  });

  const incomeByCategory: Record<string, number> = {};
  monthTx.filter(t => t.type === 'credit').forEach(t => {
    incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.value;
  });
  // Adicionar receitas agendadas por categoria
  scheduledCreditIncome.forEach(t => {
    if (t.category) {
      incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.value;
    }
  });

  const cardByCategory: Record<string, number> = {};
  ccFiltered.filter(t => !t.isPayment && t.value > 0).forEach(t => {
    cardByCategory[t.category] = (cardByCategory[t.category] || 0) + t.value;
  });
  // Adicionar gastos de cartão agendados por categoria
  scheduledCardExpenses.forEach(t => {
    if (t.category) {
      cardByCategory[t.category] = (cardByCategory[t.category] || 0) + t.value;
    }
  });

  // ========================================
  // GRÁFICO RECEITAS x DESPESAS
  // ========================================
  // totalExpenses = despesas em débito + gastos no cartão (NÃO inclui pagamentos de cartão,
  // porque pagamento de fatura é apenas transferência banco→cartão, não uma nova despesa)
  // ========================================
  const totalExpenses = totalExpensesWithScheduled + cardSpentWithScheduled;

  // Saldo = receitas - despesas (quanto sobrou depois de tudo)
  const balance = totalIncomeWithScheduled - totalExpenses;
  // Taxa de economia: % da receita que sobrou
  const savingsRate = totalIncomeWithScheduled > 0 ? ((balance / totalIncomeWithScheduled) * 100) : 0;

  // ========================================
  // PERCENTUAIS PARA O GRÁFICO (PROPORCIONAL)
  // ========================================
  // A pizza mostra a PROPORÇÃO entre receitas e despesas no total movimentado.
  // Sempre soma 100%, funciona mesmo quando despesas > receitas.
  // Ex: Rec=R$1000, Desp=R$2437 → verde=29.1%, vermelho=70.9%
  // ========================================
  const totalMoved = totalIncomeWithScheduled + totalExpenses;
  const incomePercent = totalMoved > 0 ? (totalIncomeWithScheduled / totalMoved) * 100 : 50;
  const expensePercent = totalMoved > 0 ? (totalExpenses / totalMoved) * 100 : 50;

  // ========================================
  // COMPROMETIMENTO DA RECEITA (CORRIGIDO)
  // ========================================
  // Comprometimento de CAIXA: % que JÁ saiu do banco + agendado (despesas em débito)
  // Comprometimento de CARTÃO: % da fatura pendente (saldo atual do cartão)
  // Comprometimento TOTAL: soma dos dois
  // ========================================
  const cashCommitment = totalIncomeWithScheduled > 0 ? (totalExpensesWithScheduled / totalIncomeWithScheduled) * 100 : 0;
  const cardCommitment = totalIncomeWithScheduled > 0 ? (totalCardBalance / totalIncomeWithScheduled) * 100 : 0;
  const totalCommitment = cashCommitment + cardCommitment;

  // Saúde financeira baseada no comprometimento de CAIXA
  const financialHealth = Math.max(0, Math.min(100, 100 - cashCommitment + (savingsRate > 0 ? savingsRate * 0.5 : 0)));

  // Contadores de lançamentos para exibição
  const scheduledCount = monthScheduled.length;
  const scheduledDebitCount = scheduledDebitExpenses.length;
  const scheduledCreditCount = scheduledCreditIncome.length;
  const scheduledCardCount = scheduledCardExpenses.length;
  const scheduledCardPaymentCount = scheduledCardPayments.length;

  // ========================================
  // RECONCILIAÇÃO DOS VALORES DO PERÍODO
  // ========================================
  // Usa os valores FILTRADOS pelo período selecionado
  // ========================================
  const totalInitialBalance = banks.reduce((s, b) => s + b.initialBalance, 0);

  // Receitas e despesas DO PERÍODO (incluindo lançamentos agendados)
  const periodIncome = totalIncomeWithScheduled; // receitas realizadas + agendadas
  const periodExpenses = totalExpensesWithScheduled + totalCardPaymentsWithScheduled; // despesas + pagamentos de cartão (incluindo agendados)

  // Variação do período
  const periodVariation = periodIncome - periodExpenses;

  // Totais para exibição (realizadas + agendadas)
  const displayIncome = totalIncomeWithScheduled;
  const displayExpenses = totalExpensesWithScheduled;
  const displayCardSpent = cardSpentWithScheduled;
  
  // Verificação de consistência (usa TODO o histórico para validar o saldo atual)
  const allTimeIncome = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.value, 0);
  const allTimeExpenses = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.value, 0);
  const calculatedBalance = totalInitialBalance + allTimeIncome - allTimeExpenses;

  // ========== NOVA ANÁLISE FINANCEIRA ==========

  // Lançamentos futuros por mês (próximos 6 meses)
  const getMonthlyProjections = () => {
    const projections: { month: string; year: number; monthName: string; scheduledExpenses: number; scheduledIncome: number; netBalance: number; recurringExpenses: number; recurringIncome: number }[] = [];

    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthStr = date.toISOString().substring(0, 7);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
      const monthStart = date.toISOString().split('T')[0];

      // Filtrar lançamentos futuros do mês
      const monthScheduled = scheduledTransactions.filter(s =>
        s.status === 'pending' &&
        s.dueDate >= monthStart &&
        s.dueDate <= monthEnd
      );

      // Separar receitas e despesas
      const monthExpenses = monthScheduled.filter(s => s.transactionType !== 'credit');
      const monthIncome = monthScheduled.filter(s => s.transactionType === 'credit');

      const scheduledExpenses = monthExpenses.reduce((sum, s) => sum + s.value, 0);
      const scheduledIncome = monthIncome.reduce((sum, s) => sum + s.value, 0);

      const recurringExpenses = monthExpenses
        .filter(s => s.type === 'recurring')
        .reduce((sum, s) => sum + s.value, 0);
      const recurringIncome = monthIncome
        .filter(s => s.type === 'recurring')
        .reduce((sum, s) => sum + s.value, 0);

      projections.push({
        month: monthStr,
        year: date.getFullYear(),
        monthName: date.toLocaleDateString('pt-BR', { month: 'short' }),
        scheduledExpenses,
        scheduledIncome,
        netBalance: scheduledIncome - scheduledExpenses,
        recurringExpenses,
        recurringIncome
      });
    }

    return projections;
  };

  const projections = getMonthlyProjections();

  // Receita mensal média (últimos 3 meses)
  const getAverageIncome = () => {
    let totalIncome = 0;
    for (let i = 0; i < 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = date.toISOString().split('T')[0];
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

      const monthIncome = transactions
        .filter(t => t.type === 'credit' && t.date >= monthStart && t.date <= monthEnd)
        .reduce((sum, t) => sum + t.value, 0);

      totalIncome += monthIncome;
    }
    return totalIncome / 3;
  };

  const averageIncome = getAverageIncome();

  // Despesas fixas mensais (recorrentes) - apenas do mês atual
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const monthlyFixedExpenses = scheduledTransactions
    .filter(s => {
      if (s.status !== 'pending' || s.type !== 'recurring' || s.transactionType === 'credit') return false;
      return s.dueDate >= currentMonthStart && s.dueDate <= currentMonthEnd;
    })
    .reduce((sum, s) => sum + s.value, 0);

  // Receitas fixas mensais (recorrentes) - apenas do mês atual
  const monthlyFixedIncome = scheduledTransactions
    .filter(s => {
      if (s.status !== 'pending' || s.type !== 'recurring' || s.transactionType !== 'credit') return false;
      return s.dueDate >= currentMonthStart && s.dueDate <= currentMonthEnd;
    })
    .reduce((sum, s) => sum + s.value, 0);

  // Parcelas de despesas deste mês
  const thisMonthParcels = scheduledTransactions
    .filter(s => {
      if (s.status !== 'pending' || s.type !== 'parcel' || s.transactionType === 'credit') return false;
      return s.dueDate >= currentMonthStart && s.dueDate <= currentMonthEnd;
    })
    .reduce((sum, s) => sum + s.value, 0);

  // Parcelas de receitas deste mês
  const thisMonthParcelsIncome = scheduledTransactions
    .filter(s => {
      if (s.status !== 'pending' || s.type !== 'parcel' || s.transactionType !== 'credit') return false;
      return s.dueDate >= currentMonthStart && s.dueDate <= currentMonthEnd;
    })
    .reduce((sum, s) => sum + s.value, 0);

  // Receita mínima necessária (considerando receitas programadas)
  // Fórmula corrigida: despesas fixas + parcelas + margem de 80% sobre despesas variáveis (sem dupla contagem)
  const totalScheduledIncome = monthlyFixedIncome + thisMonthParcelsIncome;
  const totalFixedCommitments = monthlyFixedExpenses + thisMonthParcels;
  const totalVariableExpenses = Math.max(0, totalExpenses - totalFixedCommitments);
  const minimumRequired = Math.max(0, totalFixedCommitments + totalVariableExpenses * 0.8 - totalScheduledIncome);

  // ============================================================
  // Comprometimento = (Total de Despesas / Total de Receitas) × 100
  // Usando as variáveis já calculadas acima
  // ============================================================
  const revenueCommitment = totalCommitment; // usa o comprometimento total calculado

  // Função para abrir relatório de categoria
  const openCategoryReport = (categoryId: string, type: 'income' | 'expense' | 'card' | 'total') => {
    let filteredTx: any[] = [];
    let total = 0;

    if (type === 'income') {
      filteredTx = monthTx
        .filter(t => t.type === 'credit' && t.category === categoryId)
        .map(t => ({ date: t.date, description: t.description, bank: t.bank, card: null, value: t.value }));
      total = filteredTx.reduce((s, t) => s + t.value, 0);
    } else if (type === 'expense') {
      filteredTx = monthTx
        .filter(t => t.type === 'debit' && t.category === categoryId)
        .map(t => ({ date: t.date, description: t.description, bank: t.bank, card: null, value: t.value }));
      total = filteredTx.reduce((s, t) => s + t.value, 0);
    } else if (type === 'card') {
      filteredTx = ccFiltered
        .filter(t => !t.isPayment && t.value > 0 && t.category === categoryId)
        .map(t => ({ date: t.date, description: t.description, bank: null, card: t.card, value: t.value }));
      total = filteredTx.reduce((s, t) => s + t.value, 0);
    } else if (type === 'total') {
      const bankTx = monthTx
        .filter(t => t.type === 'debit' && t.category === categoryId)
        .map(t => ({ date: t.date, description: t.description, bank: t.bank, card: null, value: t.value }));
      const cardTx = ccFiltered
        .filter(t => !t.isPayment && t.value > 0 && t.category === categoryId)
        .map(t => ({ date: t.date, description: t.description, bank: null, card: t.card, value: t.value }));
      filteredTx = [...bankTx, ...cardTx];
      total = filteredTx.reduce((s, t) => s + t.value, 0);
    }

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
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', transition: 'background 0.2s' }}
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

  const getPeriodLabel = () => {
    if (filterPeriod === 'thisMonth') return 'Este Mês';
    if (filterPeriod === 'lastMonth') return 'Mês Anterior';
    if (filterPeriod === 'custom' && customStartDate && customEndDate) {
      return `${fmtDate(customStartDate)} - ${fmtDate(customEndDate)}`;
    }
    return 'Histórico';
  };

  // Resetar datas personalizadas ao mudar de período
  const handlePeriodChange = (value: string) => {
    setFilterPeriod(value);
    if (value !== 'custom') {
      setCustomStartDate('');
      setCustomEndDate('');
    } else {
      // Pré-preencher com o primeiro dia do mês atual até hoje
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setCustomStartDate(firstDay.toISOString().split('T')[0]);
      setCustomEndDate(today.toISOString().split('T')[0]);
    }
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
            <select className="form-select" value={filterPeriod} onChange={e => handlePeriodChange(e.target.value)}>
              <option value="">Histórico</option>
              <option value="thisMonth">Este Mês</option>
              <option value="lastMonth">Mês Anterior</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          {filterPeriod === 'custom' && (
            <>
              <div className="form-group">
                <label className="form-label">De</label>
                <input
                  type="date"
                  className="form-select"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Até</label>
                <input
                  type="date"
                  className="form-select"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </>
          )}
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
            <div className="stat-value">{fmt(displayIncome)}</div>
            <div className="stat-label">RECEITAS {scheduledCreditCount > 0 && <span style={{fontSize: '0.7rem', color: '#059669'}}>({scheduledCreditCount} prog.)</span>}</div>
          </div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">💸</div>
          <div className="stat-content">
            <div className="stat-value">{fmt(displayExpenses)}</div>
            <div className="stat-label">DESPESAS {scheduledDebitCount > 0 && <span style={{fontSize: '0.7rem', color: '#dc2626'}}>({scheduledDebitCount} prog.)</span>}</div>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">💳</div>
          <div className="stat-content">
            <div className="stat-value">{fmt(displayCardSpent)}</div>
            <div className="stat-label">CARTÃO {scheduledCardCount > 0 && <span style={{fontSize: '0.7rem', color: '#7c3aed'}}>({scheduledCardCount} prog.)</span>}</div>
          </div>
        </div>
        <div className="stat-card pink">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{fmt(totalCardBalance)}</div>
            <div className="stat-label">SALDO CARTÕES</div>
          </div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon">🏦</div>
          <div className="stat-content">
            <div className="stat-value">{fmt(totalCardPaymentsWithScheduled)}</div>
            <div className="stat-label">PAGAMENTOS CARTÃO {scheduledCardPaymentCount > 0 && <span style={{fontSize: '0.7rem', color: '#d97706'}}>({scheduledCardPaymentCount} prog.)</span>}</div>
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

      {/* ========== RECONCILIAÇÃO FINANCEIRA ========== */}
      <div className="card" style={{ marginTop: '1rem', background: '#fefce8', border: '2px solid #fde047' }}>
        <h3 style={{ marginBottom: '1rem', color: '#854d0e' }}>🔢 Resumo do Período</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
          <div style={{ padding: '0.75rem', background: '#dcfce7', borderRadius: '0.5rem' }}>
            <div style={{ color: '#166534' }}>+ Receitas {scheduledCreditCount > 0 && <span style={{fontSize: '0.7rem'}}>(realiz.+prog.)</span>}</div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#16a34a' }}>+{fmt(periodIncome)}</div>
            {scheduledCreditIncomeTotal > 0 && (
              <div style={{ fontSize: '0.7rem', color: '#059669' }}>Prog: +{fmt(scheduledCreditIncomeTotal)}</div>
            )}
          </div>
          <div style={{ padding: '0.75rem', background: '#fee2e2', borderRadius: '0.5rem' }}>
            <div style={{ color: '#991b1b' }}>- Despesas (débito) {scheduledDebitCount > 0 && <span style={{fontSize: '0.7rem'}}>(realiz.+prog.)</span>}</div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#dc2626' }}>-{fmt(displayExpenses)}</div>
            {scheduledDebitExpensesTotal > 0 && (
              <div style={{ fontSize: '0.7rem', color: '#b91c1c' }}>Prog: -{fmt(scheduledDebitExpensesTotal)}</div>
            )}
          </div>
          <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '0.5rem' }}>
            <div style={{ color: '#92400e' }}>- Pagamentos Cartão {scheduledCardPaymentCount > 0 && <span style={{fontSize: '0.7rem'}}>(realiz.+prog.)</span>}</div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#d97706' }}>-{fmt(totalCardPaymentsWithScheduled)}</div>
            {scheduledCardPaymentsTotal > 0 && (
              <div style={{ fontSize: '0.7rem', color: '#b45309' }}>Prog: -{fmt(scheduledCardPaymentsTotal)}</div>
            )}
          </div>
          <div style={{ padding: '0.75rem', background: periodVariation >= 0 ? '#dbeafe' : '#fecaca', borderRadius: '0.5rem' }}>
            <div style={{ color: periodVariation >= 0 ? '#1e40af' : '#991b1b' }}>= Variação</div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: periodVariation >= 0 ? '#2563eb' : '#dc2626' }}>
              {periodVariation >= 0 ? '+' : ''}{fmt(periodVariation)}
            </div>
          </div>
        </div>

        {/* Detalhamento de Lançamentos Programados */}
        {scheduledCount > 0 && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0f9ff', borderRadius: '0.5rem', border: '1px solid #bae6fd' }}>
            <div style={{ fontWeight: '600', color: '#0369a1', marginBottom: '0.5rem' }}>
              📅 Lançamentos Programados no Período: {scheduledCount}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
              {scheduledCreditCount > 0 && (
                <div style={{ color: '#059669' }}>💰 Receitas: {scheduledCreditCount} (+{fmt(scheduledCreditIncomeTotal)})</div>
              )}
              {scheduledDebitCount > 0 && (
                <div style={{ color: '#dc2626' }}>💸 Despesas: {scheduledDebitCount} (-{fmt(scheduledDebitExpensesTotal)})</div>
              )}
              {scheduledCardCount > 0 && (
                <div style={{ color: '#7c3aed' }}>💳 Cartão: {scheduledCardCount} (-{fmt(scheduledCardExpensesTotal)})</div>
              )}
              {scheduledCardPaymentCount > 0 && (
                <div style={{ color: '#d97706' }}>🏦 Pgto Cartão: {scheduledCardPaymentCount} (-{fmt(scheduledCardPaymentsTotal)})</div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'white', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#6b7280' }}>Saldo Atual das Contas:</span>
            <span style={{ fontWeight: 'bold', color: totalBalance >= 0 ? '#22c55e' : '#ef4444', fontSize: '1.1rem' }}>{fmt(totalBalance)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <span style={{ color: '#6b7280' }}>Dívida no Cartão:</span>
            <span style={{ fontWeight: 'bold', color: '#d97706', fontSize: '1.1rem' }}>{fmt(totalCardBalance)}</span>
          </div>
        </div>
      </div>

      {/* ========== ANÁLISE FINANCEIRA ========== */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>📊 Análise Financeira</h3>
          <button 
            className="btn btn-sm btn-secondary" 
            onClick={() => setShowAnalysis(!showAnalysis)}
          >
            {showAnalysis ? '🔼 Ocultar' : '🔽 Mostrar'}
          </button>
        </div>

        {showAnalysis && (
          <>
            {/* Indicadores de Saúde */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Saúde Financeira */}
              <div style={{ 
                padding: '1rem', 
                background: financialHealth >= 50 ? '#f0fdf4' : '#fef2f2', 
                borderRadius: '0.75rem',
                border: `2px solid ${financialHealth >= 50 ? '#86efac' : '#fca5a5'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{financialHealth >= 70 ? '💚' : financialHealth >= 50 ? '💛' : '❤️'}</span>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Saúde Financeira</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: financialHealth >= 50 ? '#22c55e' : '#ef4444' }}>
                  {financialHealth.toFixed(0)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {financialHealth >= 70 ? 'Excelente!' : financialHealth >= 50 ? 'Razoável' : 'Atenção!'}
                </div>
              </div>

              {/* Comprometimento de Caixa */}
              <div style={{ 
                padding: '1rem', 
                background: cashCommitment <= 70 ? '#f0fdf4' : cashCommitment <= 100 ? '#fff7ed' : '#fef2f2', 
                borderRadius: '0.75rem',
                border: `2px solid ${cashCommitment <= 70 ? '#86efac' : cashCommitment <= 100 ? '#fdba74' : '#fca5a5'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>💵</span>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Comp. Caixa</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: cashCommitment <= 70 ? '#22c55e' : cashCommitment <= 100 ? '#f59e0b' : '#ef4444' }}>
                  {cashCommitment.toFixed(0)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  já saiu do banco
                </div>
              </div>

              {/* Comprometimento de Cartão */}
              <div style={{ 
                padding: '1rem', 
                background: '#fef3c7', 
                borderRadius: '0.75rem',
                border: '2px solid #fcd34d'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>💳</span>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Comp. Cartão</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706' }}>
                  {cardCommitment.toFixed(0)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  fatura pendente
                </div>
              </div>

              {/* Comprometimento Total */}
              <div style={{ 
                padding: '1rem', 
                background: totalCommitment <= 100 ? '#f0fdf4' : '#fef2f2', 
                borderRadius: '0.75rem',
                border: `2px solid ${totalCommitment <= 100 ? '#86efac' : '#fca5a5'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>📊</span>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Comp. Total</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: totalCommitment <= 100 ? '#22c55e' : '#ef4444' }}>
                  {totalCommitment.toFixed(0)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  caixa + cartão
                </div>
              </div>

              {/* Receita Mínima */}
              <div style={{ 
                padding: '1rem', 
                background: '#eff6ff', 
                borderRadius: '0.75rem',
                border: '2px solid #93c5fd'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🎯</span>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Receita Mínima</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>
                  {fmt(minimumRequired)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  mensal necessária
                </div>
              </div>

              {/* Despesas Fixas */}
              <div style={{ 
                padding: '1rem', 
                background: '#faf5ff', 
                borderRadius: '0.75rem',
                border: '2px solid #d8b4fe'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🔄</span>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Despesas Fixas</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#9333ea' }}>
                  {fmt(monthlyFixedExpenses)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  recorrentes mensais
                </div>
              </div>

              {/* Receitas Fixas Programadas */}
              {monthlyFixedIncome > 0 && (
                <div style={{ 
                  padding: '1rem', 
                  background: '#f0fdf4', 
                  borderRadius: '0.75rem',
                  border: '2px solid #86efac'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>💰</span>
                    <span style={{ fontWeight: 600, color: '#374151' }}>Receitas Fixas</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>
                    +{fmt(monthlyFixedIncome)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    receitas programadas
                  </div>
                </div>
              )}
            </div>

            {/* Projeção por Mês */}
            <h4 style={{ marginBottom: '1rem' }}>📅 Projeção Próximos 6 Meses</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
              {projections.map((p, i) => (
                <div key={p.month} style={{ 
                  padding: '0.75rem', 
                  background: i === 0 ? '#eff6ff' : '#f9fafb', 
                  borderRadius: '0.5rem',
                  textAlign: 'center',
                  border: i === 0 ? '2px solid #3b82f6' : '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    {p.monthName}
                  </div>
                  {/* Despesas */}
                  {p.scheduledExpenses > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.25rem' }}>
                      -{fmt(p.scheduledExpenses)}
                    </div>
                  )}
                  {/* Receitas */}
                  {p.scheduledIncome > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#22c55e' }}>
                      +{fmt(p.scheduledIncome)}
                    </div>
                  )}
                  {/* Saldo Líquido */}
                  <div style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 'bold', 
                    color: p.netBalance >= 0 ? '#22c55e' : '#ef4444',
                    borderTop: '1px solid #e5e7eb',
                    marginTop: '0.25rem',
                    paddingTop: '0.25rem'
                  }}>
                    {p.netBalance >= 0 ? '+' : ''}{fmt(p.netBalance)}
                  </div>
                  {p.recurringExpenses > 0 && (
                    <div style={{ fontSize: '0.6rem', color: '#ef4444' }}>
                      🔁 {fmt(p.recurringExpenses)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Legenda */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
              <span>🔴 Despesas Programadas</span>
              <span>🟢 Receitas Programadas</span>
              <span>📊 Saldo Líquido</span>
            </div>

            {/* Dicas */}
            <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #bae6fd' }}>
              <h5 style={{ margin: '0 0 0.5rem 0', color: '#0369a1' }}>💡 Dicas para sua Vida Financeira</h5>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#0c4a6e' }}>
                {savingsRate < 10 && (
                  <li>Tente reservar pelo menos 10% da sua receita mensal para emergências</li>
                )}
                {revenueCommitment > 80 && (
                  <li>Seu comprometimento está alto ({revenueCommitment.toFixed(0)}%). Reveja despesas não essenciais</li>
                )}
                {monthlyFixedExpenses > (averageIncome + monthlyFixedIncome) * 0.5 && (
                  <li>Suas despesas fixas representam mais de 50% da receita. Considere renegociar contratos</li>
                )}
                {totalBalance < 0 && (
                  <li>Seu saldo está negativo! Priorize quitar dívidas com juros altos</li>
                )}
                {monthlyFixedIncome > 0 && (
                  <li>Você tem {fmt(monthlyFixedIncome)} em receitas programadas. Isso ajuda no planejamento! 💰</li>
                )}
                {financialHealth >= 70 && (
                  <li>Parabéns! Sua saúde financeira está ótima. Continue assim! 🎉</li>
                )}
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Gráfico Receitas x Despesas */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>📊 Receitas x Despesas</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Gráfico de pizza: proporção entre receitas e despesas */}
          <div style={{ position: 'relative' }}>
            <div 
              style={{ 
                width: 200, 
                height: 200, 
                borderRadius: '50%', 
                background: totalMoved > 0
                  ? `conic-gradient(#22c55e 0% ${incomePercent}%, #ef4444 ${incomePercent}% 100%)`
                  : '#e5e7eb',
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
                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: balance >= 0 ? '#22c55e' : '#ef4444' }}>
                  {fmt(balance)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {savingsRate >= 0 ? '+' : ''}{savingsRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
          
          {/* Legenda e percentuais */}
          <div style={{ minWidth: 220 }}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 16, height: 16, background: '#22c55e', borderRadius: 4 }}></div>
              <div>
                <div style={{ fontWeight: 600, color: '#22c55e' }}>💰 Receitas</div>
                <div style={{ fontSize: '0.9rem' }}>{fmt(totalIncomeWithScheduled)} <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>({incomePercent.toFixed(1)}%)</span></div>
              </div>
            </div>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 16, height: 16, background: '#ef4444', borderRadius: 4 }}></div>
              <div>
                <div style={{ fontWeight: 600, color: '#ef4444' }}>💸 Despesas</div>
                <div style={{ fontSize: '0.9rem' }}>{fmt(totalExpenses)} <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>({expensePercent.toFixed(1)}%)</span></div>
              </div>
            </div>
            <div style={{ padding: '0.75rem', background: balance >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: '0.5rem', border: `1px solid ${balance >= 0 ? '#86efac' : '#fca5a5'}` }}>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Taxa de Economia</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: balance >= 0 ? '#22c55e' : '#ef4444' }}>
                {savingsRate >= 0 ? '📈 ' : '📉 '}{savingsRate.toFixed(1)}%
              </div>
            </div>
            {balance < 0 && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fef2f2', borderRadius: '0.375rem', border: '1px solid #fca5a5', fontSize: '0.75rem', color: '#dc2626' }}>
                ⚠️ Despesas ultrapassaram as receitas em {fmt(Math.abs(balance))}
              </div>
            )}
          </div>
        </div>
        
        {/* Barra visual: proporção receitas x despesas */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', height: 30, borderRadius: 8, overflow: 'hidden', background: '#e5e7eb' }}>
            <div style={{ width: `${incomePercent}%`, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 600, minWidth: incomePercent > 10 ? 60 : 0 }}>
              {incomePercent > 10 && `${incomePercent.toFixed(0)}%`}
            </div>
            <div style={{ width: `${expensePercent}%`, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 600, minWidth: expensePercent > 10 ? 60 : 0 }}>
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
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {categoryReport.categoryIcon} {categoryReport.categoryName}
                </h3>
                <small style={{ color: '#6b7280' }}>
                  {getPeriodLabel()} • {categoryReport.type === 'income' ? 'Receitas' : categoryReport.type === 'card' ? 'Cartão' : 'Despesas'}
                </small>
              </div>
              <button onClick={() => setCategoryReport(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>
                ×
              </button>
            </div>
            
            {/* Total */}
            <div style={{ padding: '1rem 1.5rem', background: categoryReport.type === 'income' ? '#f0fdf4' : '#fef2f2', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Total</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: categoryReport.type === 'income' ? '#22c55e' : '#ef4444' }}>
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
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(t.value)}</td>
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
