-- ============================================
-- TABELA DE LANÇAMENTOS FUTUROS
-- ============================================
-- Execute este SQL no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql

-- Criar tabela
CREATE TABLE IF NOT EXISTS scheduled_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'single' CHECK (type IN ('parcel', 'recurring', 'single')),
  transaction_type TEXT NOT NULL DEFAULT 'debit' CHECK (transaction_type IN ('debit', 'credit')),
  value DECIMAL(10,2) NOT NULL,
  total_installments INTEGER DEFAULT 1,
  current_installment INTEGER DEFAULT 1,
  due_date DATE NOT NULL,
  category TEXT,
  bank TEXT,
  card TEXT,
  is_paid BOOLEAN DEFAULT FALSE,
  auto_confirm BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE scheduled_transactions ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem acessar seus próprios lançamentos
CREATE POLICY "Users can view own scheduled transactions" ON scheduled_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled transactions" ON scheduled_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled transactions" ON scheduled_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled transactions" ON scheduled_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_user_id ON scheduled_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_due_date ON scheduled_transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_status ON scheduled_transactions(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_transaction_type ON scheduled_transactions(transaction_type);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scheduled_transactions_updated_at
    BEFORE UPDATE ON scheduled_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SE A TABELA JÁ EXISTIR, ADICIONE A NOVA COLUNA:
-- ============================================
-- ALTER TABLE scheduled_transactions 
-- ADD COLUMN IF NOT EXISTS transaction_type TEXT NOT NULL DEFAULT 'debit' 
-- CHECK (transaction_type IN ('debit', 'credit'));

-- ============================================
-- PRONTO! A tabela está criada.
-- ============================================
