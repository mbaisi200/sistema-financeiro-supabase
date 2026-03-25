-- ============================================
-- DIAGNÓSTICO E CORREÇÃO DA TABELA USERS
-- ============================================
-- Execute no Supabase SQL Editor

-- 1. VER TODOS OS USUÁRIOS NA TABELA
SELECT * FROM users ORDER BY created_at DESC;

-- 2. VERIFICAR ESTRUTURA DA TABELA
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users';

-- 3. VERIFICAR SE HÁ DADOS DUPLICADOS OU INCOMPLETOS
SELECT id, email, created_at, expires_at, is_admin, created_by
FROM users
WHERE email IS NULL OR id IS NULL;

-- 4. FORÇAR INSERÇÃO DE USUÁRIO ESPECÍFICO (substitua pelo email correto)
-- INSERT INTO users (id, email, created_at, is_admin)
-- VALUES ('UUID_DO_USUARIO', 'email@exemplo.com', NOW(), false)
-- ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- 5. DAR PERMISSÃO TOTAL PARA SERVICE ROLE (bypass RLS)
-- Isso permite que a API com Service Role Key funcione sem bloqueios
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Criar política que permite tudo para service_role
DROP POLICY IF EXISTS "Service role can do everything" ON users;
CREATE POLICY "Service role can do everything" ON users
  FOR ALL USING (true) WITH CHECK (true);

-- Política para usuários normais verem apenas seus dados
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);
