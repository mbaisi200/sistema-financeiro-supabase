-- ============================================
-- SCRIPT COMPLETO - CORRIGIR POLÍTICAS RLS
-- ============================================
-- Execute este SQL no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql

-- ============================================
-- 1. TABELA: credit_card_transactions
-- ============================================

-- Habilitar RLS
ALTER TABLE credit_card_transactions ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view own credit card transactions" ON credit_card_transactions;
DROP POLICY IF EXISTS "Users can insert own credit card transactions" ON credit_card_transactions;
DROP POLICY IF EXISTS "Users can update own credit card transactions" ON credit_card_transactions;
DROP POLICY IF EXISTS "Users can delete own credit card transactions" ON credit_card_transactions;

-- Criar políticas
CREATE POLICY "Users can view own credit card transactions" ON credit_card_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit card transactions" ON credit_card_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit card transactions" ON credit_card_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credit card transactions" ON credit_card_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 2. TABELA: transactions
-- ============================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. TABELA: banks
-- ============================================

ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own banks" ON banks;
DROP POLICY IF EXISTS "Users can insert own banks" ON banks;
DROP POLICY IF EXISTS "Users can update own banks" ON banks;
DROP POLICY IF EXISTS "Users can delete own banks" ON banks;

CREATE POLICY "Users can view own banks" ON banks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own banks" ON banks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own banks" ON banks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own banks" ON banks
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 4. TABELA: categories
-- ============================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;

CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 5. TABELA: credit_cards
-- ============================================

ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can insert own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can update own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can delete own credit cards" ON credit_cards;

CREATE POLICY "Users can view own credit cards" ON credit_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit cards" ON credit_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit cards" ON credit_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credit cards" ON credit_cards
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- VERIFICAR SE AS TABELAS TÊM user_id
-- ============================================
-- Se alguma tabela não tiver a coluna user_id, adicione:
-- ALTER TABLE nome_tabela ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- ============================================
-- PRONTO! Todas as políticas estão corrigidas.
-- ============================================
