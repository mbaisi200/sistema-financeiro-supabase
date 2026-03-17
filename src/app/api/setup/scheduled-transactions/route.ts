import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST - Criar tabela scheduled_transactions se não existir
export async function POST(request: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const supabaseKey = supabaseServiceKey || supabaseAnonKey;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Configuração incompleta.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar se a tabela já existe tentando fazer uma consulta
    const { error: checkError } = await supabase
      .from('scheduled_transactions')
      .select('id')
      .limit(1);

    // Se não houver erro, a tabela já existe
    if (!checkError) {
      return NextResponse.json({ 
        success: true, 
        message: 'Tabela scheduled_transactions já existe.',
        exists: true 
      });
    }

    // Se o erro não for "relation does not exist", retornar erro
    if (!checkError.message.includes('does not exist') && !checkError.message.includes('relation')) {
      console.error('Erro ao verificar tabela:', checkError);
      // Tentar criar a tabela mesmo assim
    }

    // Usar RPC para executar SQL se disponível, ou criar registros para inferir schema
    // Como não podemos executar SQL diretamente via SDK, vamos tentar inserir um registro
    // e deixar o Supabase criar a tabela automaticamente se tiver configuração apropriada
    
    // Na verdade, precisamos usar uma abordagem diferente
    // Vamos verificar se conseguimos acessar via service role para criar a tabela
    
    if (supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // Tentar criar a tabela via RPC ou SQL
      // Supabase não permite executar DDL via SDK diretamente
      // Então vamos retornar instruções para o usuário criar manualmente
      
      return NextResponse.json({ 
        success: false, 
        message: 'A tabela scheduled_transactions não existe. Por favor, crie a tabela no Supabase.',
        sql: `
CREATE TABLE scheduled_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('parcel', 'recurring', 'single')),
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX idx_scheduled_transactions_user_id ON scheduled_transactions(user_id);
CREATE INDEX idx_scheduled_transactions_due_date ON scheduled_transactions(due_date);
CREATE INDEX idx_scheduled_transactions_status ON scheduled_transactions(status);

-- Habilitar RLS
ALTER TABLE scheduled_transactions ENABLE ROW LEVEL SECURITY;

-- Política para usuários acessarem apenas seus próprios dados
CREATE POLICY "Users can access their own scheduled transactions" ON scheduled_transactions
  FOR ALL USING (auth.uid()::text = user_id);
        `,
        exists: false 
      });
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Não foi possível verificar/criar a tabela. Verifique as configurações do Supabase.',
      exists: false 
    });

  } catch (error) {
    console.error('Erro ao criar tabela:', error);
    return NextResponse.json({
      error: 'Erro ao criar tabela: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}

// GET - Verificar se a tabela existe
export async function GET(request: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ exists: false, error: 'Configuração incompleta.' });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Tentar fazer uma consulta simples
    const { error } = await supabase
      .from('scheduled_transactions')
      .select('id')
      .limit(1);

    return NextResponse.json({ 
      exists: !error,
      error: error?.message 
    });

  } catch (error) {
    return NextResponse.json({ 
      exists: false, 
      error: 'Erro ao verificar tabela' 
    });
  }
}
