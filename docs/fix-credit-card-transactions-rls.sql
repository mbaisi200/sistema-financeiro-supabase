-- ============================================
-- CORRIGIR POLÍTICAS RLS - TRANSAÇÕES DE CARTÃO
-- ============================================
-- Execute este SQL no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql

-- Verificar se RLS está habilitado
ALTER TABLE credit_card_transactions ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se houver) para evitar conflitos
DROP POLICY IF EXISTS "Users can view own credit card transactions" ON credit_card_transactions;
DROP POLICY IF EXISTS "Users can insert own credit card transactions" ON credit_card_transactions;
DROP POLICY IF EXISTS "Users can update own credit card transactions" ON credit_card_transactions;
DROP POLICY IF EXISTS "Users can delete own credit card transactions" ON credit_card_transactions;

-- Criar políticas corretas
CREATE POLICY "Users can view own credit card transactions" ON credit_card_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit card transactions" ON credit_card_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit card transactions" ON credit_card_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credit card transactions" ON credit_card_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- VERIFICAR SE A TABELA TEM A COLUNA user_id
-- ============================================
-- Se a tabela não tiver user_id, execute:
-- ALTER TABLE credit_card_transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- ============================================
-- VERIFICAR ESTRUTURA DA TABELA
-- ============================================
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'credit_card_transactions';

-- ============================================
-- PRONTO! As políticas estão corrigidas.
-- ============================================
