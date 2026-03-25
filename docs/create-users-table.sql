-- ============================================
-- SCRIPT: Criar Tabela USERS no Supabase
-- ============================================
-- Execute este SQL no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql

-- ============================================
-- 1. CRIAR TABELA users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  expires_at TIMESTAMPTZ,
  is_admin BOOLEAN DEFAULT FALSE
);

-- ============================================
-- 2. HABILITAR RLS (Row Level Security)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. CRIAR POLÍTICAS RLS
-- ============================================
-- Permitir que usuários vejam apenas seu próprio registro
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Permitir que service role insira/atualize (para admin)
-- Nota: Service role bypassa RLS automaticamente

-- ============================================
-- 4. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_expires_at ON users(expires_at);

-- ============================================
-- 5. VERIFICAR SE A TABELA FOI CRIADA
-- ============================================
SELECT * FROM users LIMIT 5;

-- ============================================
-- PRONTO! Agora clique em "Sincronizar" no
-- painel admin para importar usuários do Auth.
-- ============================================
