'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Bank, Category, CreditCard, Transaction, CreditCardTransaction, ScheduledTransaction, DEFAULT_BANKS, DEFAULT_CATEGORIES, ADMIN_EMAILS } from '@/lib/types';

interface FinanceContextType {
  user: User | null;
  loading: boolean;
  isOnline: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  banks: Bank[];
  categories: Category[];
  creditCards: CreditCard[];
  transactions: Transaction[];
  creditCardTransactions: CreditCardTransaction[];
  scheduledTransactions: ScheduledTransaction[];
  scheduledTransactionsTableExists: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  addBank: (bank: Omit<Bank, 'id'>) => Promise<void>;
  updateBank: (id: string, bank: Partial<Bank>) => Promise<void>;
  deleteBank: (id: string) => Promise<void>;
  getBankBalance: (bankId: string) => number;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addCreditCard: (card: Omit<CreditCard, 'id'>) => Promise<void>;
  updateCreditCard: (id: string, card: Partial<CreditCard>) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;
  getCardInvoice: (cardId: string) => number;
  getCardTotalDebt: (cardId: string) => number;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCreditCardTransaction: (transaction: Omit<CreditCardTransaction, 'id'>) => Promise<void>;
  updateCreditCardTransaction: (id: string, transaction: Partial<CreditCardTransaction>) => Promise<void>;
  deleteCreditCardTransaction: (id: string) => Promise<void>;
  payCardInvoice: (cardId: string, bankId: string, value: number, date: string) => Promise<void>;
  loadScheduledTransactions: () => Promise<void>;
  addScheduledTransaction: (transaction: Omit<ScheduledTransaction, 'id'>) => Promise<ScheduledTransaction | null>;
  updateScheduledTransaction: (id: string, transaction: Partial<ScheduledTransaction>) => Promise<void>;
  deleteScheduledTransaction: (id: string) => Promise<void>;
  confirmScheduledTransaction: (id: string, confirmedValue?: number, confirmedDate?: string, useCreditCard?: boolean) => Promise<void>;
  getCategoryName: (id: string) => string;
  getCategoryIcon: (id: string) => string;
  getBankName: (id: string) => string;
  getBankIcon: (id: string) => string;
  getCardName: (id: string) => string;
  getCardIcon: (id: string) => string;
  exportToCSV: () => string;
  exportToJSON: () => string;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditCardTransactions, setCreditCardTransactions] = useState<CreditCardTransaction[]>([]);
  const [scheduledTransactions, setScheduledTransactions] = useState<ScheduledTransaction[]>([]);
  const [scheduledTransactionsTableExists, setScheduledTransactionsTableExists] = useState<boolean>(true);
  
  // Refs para evitar loops
  const initializingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const lastEventRef = useRef<string | null>(null); // Rastrear último evento para evitar duplicados

  // Verificar expiração da conta
  const checkExpiration = useCallback(async (uid: string) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('expires_at, email')
        .eq('id', uid)
        .single();

      if (error) {
        console.error('Erro ao verificar expiração:', error);
        setIsExpired(false);
        return false;
      }

      if (userData) {
        const expirationDate = userData.expires_at;
        setExpiresAt(expirationDate || null);
        
        // Admin nunca expira
        if (ADMIN_EMAILS.includes(userData.email)) {
          setIsExpired(false);
          return false;
        }
        
        if (expirationDate) {
          const expDate = new Date(expirationDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          expDate.setHours(0, 0, 0, 0);
          
          const expired = today > expDate;
          setIsExpired(expired);
          return expired;
        }
      }
      setIsExpired(false);
      return false;
    } catch (error) {
      console.error('Erro ao verificar expiração:', error);
      setIsExpired(false);
      return false;
    }
  }, []);

  // Carregar dados do usuário
  const loadUserData = useCallback(async (uid: string) => {
    try {
      // Carregar bancos
      const { data: banksData } = await supabase
        .from('banks')
        .select('*')
        .eq('user_id', uid);
      
      if (banksData) {
        setBanks(banksData.map(b => ({
          id: b.id,
          name: b.name,
          icon: b.icon,
          initialBalance: b.initial_balance
        })));
      }

      // Carregar categorias
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', uid);
      
      if (categoriesData) {
        const cats = categoriesData.map(c => ({
          id: c.id,
          name: c.name,
          icon: c.icon
        }));
        setCategories(cats.sort((a, b) => a.name.localeCompare(b.name)));
      }

      // Carregar cartões de crédito
      const { data: cardsData } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', uid);
      
      if (cardsData) {
        setCreditCards(cardsData.map(c => ({
          id: c.id,
          name: c.name,
          bank: c.bank || '',
          limit: c.credit_limit,
          icon: c.icon
        })));
      }

      // Carregar transações
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      
      if (transactionsData) {
        setTransactions(transactionsData.map(t => ({
          id: t.id,
          date: t.date,
          description: t.description,
          bank: t.bank,
          type: t.type,
          category: t.category,
          value: t.value
        })));
      }

      // Carregar transações de cartão
      const { data: ccTransactionsData } = await supabase
        .from('credit_card_transactions')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      
      if (ccTransactionsData) {
        setCreditCardTransactions(ccTransactionsData.map(t => ({
          id: t.id,
          date: t.date,
          description: t.description,
          card: t.card,
          category: t.category,
          value: t.value,
          isPayment: t.is_payment
        })));
      }

      // Carregar lançamentos futuros
      const { data: scheduledData, error: scheduledError } = await supabase
        .from('scheduled_transactions')
        .select('*')
        .eq('user_id', uid)
        .order('due_date', { ascending: true });
      
      if (scheduledError) {
        if (scheduledError.message.includes('does not exist') || scheduledError.message.includes('relation')) {
          setScheduledTransactionsTableExists(false);
          setScheduledTransactions([]);
        } else {
          console.error('Erro ao carregar lançamentos futuros:', scheduledError);
        }
      } else if (scheduledData) {
        setScheduledTransactionsTableExists(true);
        setScheduledTransactions(scheduledData.map(t => ({
          id: t.id,
          description: t.description,
          type: t.type,
          transactionType: t.transaction_type || 'debit',
          value: parseFloat(t.value),
          totalInstallments: t.total_installments,
          currentInstallment: t.current_installment,
          dueDate: t.due_date,
          category: t.category || '',
          bank: t.bank || '',
          card: t.card || '',
          isPaid: t.is_paid,
          autoConfirm: t.auto_confirm,
          status: t.status
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }, []);

  // Inicializar dados padrão para novo usuário
  const initDefaultData = async (uid: string) => {
    const { data: existingBanks } = await supabase
      .from('banks')
      .select('id')
      .eq('user_id', uid);
    
    if (existingBanks && existingBanks.length > 0) return;

    for (const [id, bank] of Object.entries(DEFAULT_BANKS)) {
      await supabase.from('banks').insert({
        user_id: uid,
        name: bank.name,
        icon: bank.icon,
        initial_balance: bank.initialBalance
      });
    }
    
    for (const [id, cat] of Object.entries(DEFAULT_CATEGORIES)) {
      await supabase.from('categories').insert({
        user_id: uid,
        name: cat.name,
        icon: cat.icon
      });
    }
  };

  // Auth state listener - CORRIGIDO PARA EVITAR LOOPS
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      // Evitar inicialização duplicada
      if (initializingRef.current) return;
      initializingRef.current = true;

      try {
        // Verificar sessão atual
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('Erro ao obter sessão:', error);
          setUser(null);
          setLoading(false);
          return;
        }

        setUser(session?.user ?? null);

        if (session?.user) {
          lastUserIdRef.current = session.user.id;
          await checkExpiration(session.user.id);
          await loadUserData(session.user.id);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Erro na inicialização:', err);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      } finally {
        // CRÍTICO: Permitir reinicialização após conclusão
        initializingRef.current = false;
      }
    };

    initAuth();

    // Escutar mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const newUserId = session?.user?.id || null;
      
      // Ignorar TOKEN_REFRESHED - não precisa recarregar dados
      if (event === 'TOKEN_REFRESHED') {
        return;
      }
      
      // Ignorar INITIAL_SESSION - já foi processado no initAuth()
      if (event === 'INITIAL_SESSION') {
        return;
      }
      
      // Evitar processar o mesmo evento/usuário múltiplas vezes em sequência
      const eventKey = `${event}-${newUserId}`;
      if (lastEventRef.current === eventKey) {
        return;
      }
      lastEventRef.current = eventKey;
      
      lastUserIdRef.current = newUserId;
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Criar registro na tabela users se não existir
        if (event === 'SIGNED_IN') {
          try {
            const { data: existingUser } = await supabase
              .from('users')
              .select('id')
              .eq('id', session.user.id)
              .single();
            
            if (!existingUser) {
              await supabase.from('users').insert({
                id: session.user.id,
                email: session.user.email!
              });
              await initDefaultData(session.user.id);
            }
          } catch (err) {
            console.error('Erro ao verificar usuário:', err);
          }
        }
        
        await checkExpiration(session.user.id);
        await loadUserData(session.user.id);
      } else {
        setIsExpired(false);
        setExpiresAt(null);
        setBanks([]);
        setCategories([]);
        setCreditCards([]);
        setTransactions([]);
        setCreditCardTransactions([]);
        setScheduledTransactions([]);
        setScheduledTransactionsTableExists(true);
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      initializingRef.current = false;
      lastEventRef.current = null;
      subscription.unsubscribe();
    };
  }, [checkExpiration, loadUserData]);

  // Online status
  useEffect(() => {
    let mounted = true;
    
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('banks').select('id').limit(1);
        if (mounted) setIsOnline(!error);
      } catch {
        if (mounted) setIsOnline(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    const handleOnline = () => checkConnection();
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auth functions
  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register = async (email: string, password: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    
    const { data: pendingData } = await supabase
      .from('pending_users')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    const { data, error } = await supabase.auth.signUp({ 
      email: normalizedEmail, 
      password 
    });
    
    if (error) throw error;
    
    if (data.user) {
      if (pendingData) {
        await supabase.from('users').insert({
          id: data.user.id,
          email: normalizedEmail,
          created_by: pendingData.created_by,
          expires_at: pendingData.expires_at
        });

        const defaultBanks = pendingData.default_banks as Record<string, { icon: string; name: string; initialBalance: number }> || DEFAULT_BANKS;
        const defaultCategories = pendingData.default_categories as Record<string, { icon: string; name: string }> || DEFAULT_CATEGORIES;

        for (const bank of Object.values(defaultBanks)) {
          await supabase.from('banks').insert({
            user_id: data.user.id,
            name: bank.name,
            icon: bank.icon,
            initial_balance: bank.initialBalance
          });
        }
        for (const cat of Object.values(defaultCategories)) {
          await supabase.from('categories').insert({
            user_id: data.user.id,
            name: cat.name,
            icon: cat.icon
          });
        }

        await supabase.from('pending_users').delete().eq('email', normalizedEmail);
      }
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const changePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  // Bank functions
  const addBank = async (bank: Omit<Bank, 'id'>) => {
    if (!user) return;
    const { error } = await supabase.from('banks').insert({
      user_id: user.id,
      name: bank.name,
      icon: bank.icon,
      initial_balance: bank.initialBalance
    });
    if (error) throw error;
    await loadUserData(user.id);
  };

  const updateBank = async (id: string, bank: Partial<Bank>) => {
    if (!user) return;
    const updateData: Record<string, unknown> = {};
    if (bank.name !== undefined) updateData.name = bank.name;
    if (bank.icon !== undefined) updateData.icon = bank.icon;
    if (bank.initialBalance !== undefined) updateData.initial_balance = bank.initialBalance;
    
    const { error } = await supabase.from('banks').update(updateData).eq('id', id);
    if (error) throw error;
    await loadUserData(user.id);
  };

  const deleteBank = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('banks').delete().eq('id', id);
    if (error) throw error;
    await loadUserData(user.id);
  };

  const getBankBalance = (bankId: string) => {
    const bank = banks.find(b => b.id === bankId);
    if (!bank) return 0;
    return bank.initialBalance + transactions.filter(t => t.bank === bankId).reduce((s, t) => s + (t.type === 'credit' ? t.value : -t.value), 0);
  };

  // Category functions
  const addCategory = async (category: Omit<Category, 'id'>) => {
    if (!user) return;
    const { error } = await supabase.from('categories').insert({
      user_id: user.id,
      name: category.name,
      icon: category.icon
    });
    if (error) throw error;
    await loadUserData(user.id);
  };

  const updateCategory = async (id: string, category: Partial<Category>) => {
    if (!user) return;
    const updateData: Record<string, unknown> = {};
    if (category.name !== undefined) updateData.name = category.name;
    if (category.icon !== undefined) updateData.icon = category.icon;
    
    const { error } = await supabase.from('categories').update(updateData).eq('id', id);
    if (error) throw error;
    await loadUserData(user.id);
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    await loadUserData(user.id);
  };

  // Credit Card functions
  const addCreditCard = async (card: Omit<CreditCard, 'id'>) => {
    if (!user) return;
    const { error } = await supabase.from('credit_cards').insert({
      user_id: user.id,
      name: card.name,
      bank: card.bank,
      credit_limit: card.limit,
      icon: card.icon
    });
    if (error) throw error;
    await loadUserData(user.id);
  };

  const updateCreditCard = async (id: string, card: Partial<CreditCard>) => {
    if (!user) return;
    const updateData: Record<string, unknown> = {};
    if (card.name !== undefined) updateData.name = card.name;
    if (card.bank !== undefined) updateData.bank = card.bank;
    if (card.limit !== undefined) updateData.credit_limit = card.limit;
    if (card.icon !== undefined) updateData.icon = card.icon;
    
    const { error } = await supabase.from('credit_cards').update(updateData).eq('id', id);
    if (error) throw error;
    await loadUserData(user.id);
  };

  const deleteCreditCard = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('credit_cards').delete().eq('id', id);
    if (error) throw error;
    await loadUserData(user.id);
  };

  const getCardInvoice = (cardId: string) => {
    const now = new Date();
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const today = now.toISOString().split('T')[0];
    
    return creditCardTransactions
      .filter(t => t.card === cardId && t.date.startsWith(thisMonthStr) && t.date <= today)
      .reduce((s, t) => s + t.value, 0);
  };

  const getCardTotalDebt = (cardId: string) => {
    return creditCardTransactions
      .filter(t => t.card === cardId)
      .reduce((s, t) => s + t.value, 0);
  };

  // Transaction functions
  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!user) throw new Error('Usuário não está logado');
    
    const { data, error } = await supabase.from('transactions').insert({
      user_id: user.id,
      date: transaction.date,
      description: transaction.description,
      bank: transaction.bank,
      type: transaction.type,
      category: transaction.category,
      value: transaction.value
    }).select().single();
    
    if (error) throw error;
    
    if (data) {
      setTransactions(prev => [{
        id: data.id,
        date: data.date,
        description: data.description,
        bank: data.bank,
        type: data.type,
        category: data.category,
        value: data.value
      }, ...prev]);
    }
  };

  const updateTransaction = async (id: string, transaction: Partial<Transaction>) => {
    if (!user) return;
    const updateData: Record<string, unknown> = {};
    if (transaction.date !== undefined) updateData.date = transaction.date;
    if (transaction.description !== undefined) updateData.description = transaction.description;
    if (transaction.bank !== undefined) updateData.bank = transaction.bank;
    if (transaction.type !== undefined) updateData.type = transaction.type;
    if (transaction.category !== undefined) updateData.category = transaction.category;
    if (transaction.value !== undefined) updateData.value = transaction.value;
    
    const { error } = await supabase.from('transactions').update(updateData).eq('id', id);
    if (error) throw error;
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...transaction } : t));
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // Credit Card Transaction functions
  const addCreditCardTransaction = async (transaction: Omit<CreditCardTransaction, 'id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('credit_card_transactions').insert({
      user_id: user.id,
      date: transaction.date,
      description: transaction.description,
      card: transaction.card,
      category: transaction.category,
      value: transaction.value,
      is_payment: transaction.isPayment
    }).select().single();
    if (error) throw error;
    if (data) {
      setCreditCardTransactions(prev => [{
        id: data.id,
        date: data.date,
        description: data.description,
        card: data.card,
        category: data.category,
        value: data.value,
        isPayment: data.is_payment
      }, ...prev]);
    }
  };

  const updateCreditCardTransaction = async (id: string, transaction: Partial<CreditCardTransaction>) => {
    if (!user) return;
    const updateData: Record<string, unknown> = {};
    if (transaction.date !== undefined) updateData.date = transaction.date;
    if (transaction.description !== undefined) updateData.description = transaction.description;
    if (transaction.card !== undefined) updateData.card = transaction.card;
    if (transaction.category !== undefined) updateData.category = transaction.category;
    if (transaction.value !== undefined) updateData.value = transaction.value;
    if (transaction.isPayment !== undefined) updateData.is_payment = transaction.isPayment;
    
    const { error } = await supabase.from('credit_card_transactions').update(updateData).eq('id', id);
    if (error) throw error;
    setCreditCardTransactions(prev => prev.map(t => t.id === id ? { ...t, ...transaction } : t));
  };

  const deleteCreditCardTransaction = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('credit_card_transactions').delete().eq('id', id);
    if (error) throw error;
    setCreditCardTransactions(prev => prev.filter(t => t.id !== id));
  };

  // Pay card invoice
  const payCardInvoice = async (cardId: string, bankId: string, value: number, date: string) => {
    if (!user) return;
    
    const { error: error1 } = await supabase.from('transactions').insert({
      user_id: user.id,
      date,
      description: 'Pagamento Fatura',
      bank: bankId,
      type: 'debit',
      category: 'pagamento_cartao',
      value
    });
    if (error1) throw error1;

    const { error: error2 } = await supabase.from('credit_card_transactions').insert({
      user_id: user.id,
      date,
      description: 'Pagamento Fatura',
      card: cardId,
      category: 'pagamento_cartao',
      value: -value,
      is_payment: true
    });
    if (error2) throw error2;
    
    await loadUserData(user.id);
  };

  // Scheduled Transactions functions
  const loadScheduledTransactions = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('scheduled_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });
    
    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        setScheduledTransactionsTableExists(false);
        setScheduledTransactions([]);
      } else {
        console.error('Erro ao carregar lançamentos futuros:', error);
      }
    } else if (data) {
      setScheduledTransactionsTableExists(true);
      setScheduledTransactions(data.map(t => ({
        id: t.id,
        description: t.description,
        type: t.type,
        value: parseFloat(t.value),
        totalInstallments: t.total_installments,
        currentInstallment: t.current_installment,
        dueDate: t.due_date,
        category: t.category || '',
        bank: t.bank || '',
        card: t.card || '',
        isPaid: t.is_paid,
        autoConfirm: t.auto_confirm,
        status: t.status
      })));
    }
  };

  const addScheduledTransaction = async (transaction: Omit<ScheduledTransaction, 'id'>): Promise<ScheduledTransaction | null> => {
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('scheduled_transactions')
      .insert({
        user_id: user.id,
        description: transaction.description.toUpperCase(),
        type: transaction.type,
        transaction_type: transaction.transactionType || 'debit',
        value: transaction.value,
        total_installments: transaction.totalInstallments,
        current_installment: transaction.currentInstallment,
        due_date: transaction.dueDate,
        category: transaction.category || null,
        bank: transaction.bank || null,
        card: transaction.card || null,
        auto_confirm: transaction.autoConfirm,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        setScheduledTransactionsTableExists(false);
      }
      throw error;
    }
    
    if (data) {
      const newTx: ScheduledTransaction = {
        id: data.id,
        description: data.description,
        type: data.type,
        transactionType: data.transaction_type || 'debit',
        value: parseFloat(data.value),
        totalInstallments: data.total_installments,
        currentInstallment: data.current_installment,
        dueDate: data.due_date,
        category: data.category || '',
        bank: data.bank || '',
        card: data.card || '',
        isPaid: data.is_paid,
        autoConfirm: data.auto_confirm,
        status: data.status
      };
      setScheduledTransactions(prev => [...prev, newTx].sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
      return newTx;
    }
    return null;
  };

  const updateScheduledTransaction = async (id: string, transaction: Partial<ScheduledTransaction>) => {
    if (!user) return;
    
    const updateData: Record<string, unknown> = {};
    if (transaction.description !== undefined) updateData.description = transaction.description.toUpperCase();
    if (transaction.type !== undefined) updateData.type = transaction.type;
    if (transaction.value !== undefined) updateData.value = transaction.value;
    if (transaction.totalInstallments !== undefined) updateData.total_installments = transaction.totalInstallments;
    if (transaction.currentInstallment !== undefined) updateData.current_installment = transaction.currentInstallment;
    if (transaction.dueDate !== undefined) updateData.due_date = transaction.dueDate;
    if (transaction.category !== undefined) updateData.category = transaction.category;
    if (transaction.bank !== undefined) updateData.bank = transaction.bank;
    if (transaction.card !== undefined) updateData.card = transaction.card;
    if (transaction.isPaid !== undefined) updateData.is_paid = transaction.isPaid;
    if (transaction.autoConfirm !== undefined) updateData.auto_confirm = transaction.autoConfirm;
    if (transaction.status !== undefined) updateData.status = transaction.status;
    updateData.updated_at = new Date().toISOString();
    
    const { error } = await supabase
      .from('scheduled_transactions')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    
    setScheduledTransactions(prev => prev.map(t => t.id === id ? { ...t, ...transaction } : t));
  };

  const deleteScheduledTransaction = async (id: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('scheduled_transactions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    setScheduledTransactions(prev => prev.filter(t => t.id !== id));
  };

  const confirmScheduledTransaction = async (id: string, confirmedValue?: number, confirmedDate?: string, useCreditCard?: boolean) => {
    if (!user) return;
    
    const scheduledTx = scheduledTransactions.find(t => t.id === id);
    if (!scheduledTx) throw new Error('Lançamento não encontrado');
    
    const value = confirmedValue || scheduledTx.value;
    const date = confirmedDate || new Date().toISOString().split('T')[0];
    const transactionType = scheduledTx.transactionType || 'debit'; // padrão é débito
    
    // Criar transação real
    if (useCreditCard && scheduledTx.card) {
      const { error: ccTxError } = await supabase
        .from('credit_card_transactions')
        .insert({
          user_id: user.id,
          date: date,
          description: scheduledTx.description,
          card: scheduledTx.card,
          category: scheduledTx.category || '',
          value: value,
          is_payment: false
        });
      
      if (ccTxError) throw ccTxError;
      
      // Atualizar estado local
      setCreditCardTransactions(prev => [{
        id: Date.now().toString(),
        date: date,
        description: scheduledTx.description,
        card: scheduledTx.card,
        category: scheduledTx.category || '',
        value: value,
        isPayment: false
      }, ...prev]);
    } else if (scheduledTx.bank) {
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          date: date,
          description: scheduledTx.description,
          bank: scheduledTx.bank,
          type: transactionType, // usa o tipo do lançamento (credit ou debit)
          category: scheduledTx.category || '',
          value: value
        });
      
      if (txError) throw txError;
      
      // Atualizar estado local
      setTransactions(prev => [{
        id: Date.now().toString(),
        date: date,
        description: scheduledTx.description,
        bank: scheduledTx.bank,
        type: transactionType,
        category: scheduledTx.category || '',
        value: value
      }, ...prev]);
    } else {
      throw new Error('Lançamento deve ter banco ou cartão definido');
    }
    
    // Atualizar o lançamento futuro
    let updateData: Partial<ScheduledTransaction> = {
      isPaid: true
    };
    
    if (scheduledTx.type === 'parcel') {
      const nextInstallment = scheduledTx.currentInstallment + 1;
      if (nextInstallment >= scheduledTx.totalInstallments) {
        updateData.status = 'confirmed';
        updateData.currentInstallment = nextInstallment;
      } else {
        updateData.currentInstallment = nextInstallment;
        const nextDueDate = new Date(scheduledTx.dueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        updateData.dueDate = nextDueDate.toISOString().split('T')[0];
        updateData.isPaid = false;
      }
    } else if (scheduledTx.type === 'recurring') {
      const nextDueDate = new Date(scheduledTx.dueDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      updateData.dueDate = nextDueDate.toISOString().split('T')[0];
      updateData.isPaid = false;
    } else {
      updateData.status = 'confirmed';
    }
    
    await updateScheduledTransaction(id, updateData);
  };

  // Helper functions
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id;
  const getCategoryIcon = (id: string) => categories.find(c => c.id === id)?.icon || '📦';
  const getBankName = (id: string) => banks.find(b => b.id === id)?.name || id;
  const getBankIcon = (id: string) => banks.find(b => b.id === id)?.icon || '🏦';
  const getCardName = (id: string) => creditCards.find(c => c.id === id)?.name || id;
  const getCardIcon = (id: string) => creditCards.find(c => c.id === id)?.icon || '💳';

  // Export functions
  const exportToCSV = () => 'Data,Descricao,Banco,Tipo,Categoria,Valor\n' + transactions.map(t => `${t.date},${t.description},${getBankName(t.bank)},${t.type},${getCategoryName(t.category)},${t.value}`).join('\n');
  const exportToJSON = () => JSON.stringify({ transactions, banks, categories, creditCards, creditCardTransactions }, null, 2);

  return (
    <FinanceContext.Provider value={{ 
      user, loading, isOnline, isExpired, expiresAt,
      banks, categories, creditCards, transactions, creditCardTransactions, 
      scheduledTransactions, scheduledTransactionsTableExists,
      login, register, logout, changePassword, 
      addBank, updateBank, deleteBank, getBankBalance, 
      addCategory, updateCategory, deleteCategory, 
      addCreditCard, updateCreditCard, deleteCreditCard, getCardInvoice, getCardTotalDebt, 
      addTransaction, updateTransaction, deleteTransaction, 
      addCreditCardTransaction, updateCreditCardTransaction, deleteCreditCardTransaction, 
      payCardInvoice, loadScheduledTransactions, addScheduledTransaction, updateScheduledTransaction, 
      deleteScheduledTransaction, confirmScheduledTransaction,
      getCategoryName, getCategoryIcon, getBankName, getBankIcon, getCardName, getCardIcon, 
      exportToCSV, exportToJSON 
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
};
