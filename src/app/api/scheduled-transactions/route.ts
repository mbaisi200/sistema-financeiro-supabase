import { NextRequest, NextResponse } from 'next/server';
import { toUpperCase } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Listar lançamentos futuros
export async function GET(request: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const authHeader = request.headers.get('authorization');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Configuração incompleta' }, { status: 500 });
    }

    // Usar token do usuário para respeitar RLS
    const supabase = createClient(supabaseUrl, authHeader || supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Obter usuário do token
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''));
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se a tabela existe, se não, criar
    await ensureTableExists(supabase);

    // Buscar lançamentos
    const { data, error } = await supabase
      .from('scheduled_transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Erro ao buscar lançamentos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      scheduledTransactions: (data || []).map(item => ({
        id: item.id,
        description: item.description,
        type: item.type,
        value: parseFloat(item.value) || 0,
        totalInstallments: item.total_installments || 1,
        currentInstallment: item.current_installment || 1,
        dueDate: item.due_date,
        category: item.category,
        bank: item.bank,
        card: item.card,
        isPaid: item.is_paid || false,
        autoConfirm: item.auto_confirm || false,
        status: item.status
      }))
    });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Criar lançamento futuro
export async function POST(request: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const authHeader = request.headers.get('authorization');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Configuração incompleta' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, authHeader || supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''));
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se a tabela existe
    await ensureTableExists(supabase);

    const body = await request.json();
    const { 
      description, 
      type, 
      value, 
      totalInstallments, 
      dueDate, 
      category, 
      bank, 
      card,
      autoConfirm 
    } = body;

    if (!description || !dueDate || !value) {
      return NextResponse.json({ error: 'Descrição, data e valor são obrigatórios' }, { status: 400 });
    }

    // Criar lançamento(s)
    const installments = type === 'parcel' ? (totalInstallments || 1) : 1;
    const createdItems = [];

    for (let i = 0; i < installments; i++) {
      // Calcular data de vencimento para cada parcela
      const dueDateObj = new Date(dueDate);
      dueDateObj.setMonth(dueDateObj.getMonth() + i);
      const calculatedDueDate = dueDateObj.toISOString().split('T')[0];

      const insertData: Record<string, unknown> = {
        user_id: user.id,
        description: toUpperCase(description) + (installments > 1 ? ` (${i + 1}/${installments})` : ''),
        type: type || 'single',
        value: value,
        total_installments: installments,
        current_installment: i + 1,
        due_date: calculatedDueDate,
        category: category || null,
        bank: bank || null,
        card: card || null,
        auto_confirm: autoConfirm || false,
        status: 'pending',
        is_paid: false
      };

      const { data, error } = await supabase
        .from('scheduled_transactions')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar lançamento:', error);
        // Continua para criar as outras parcelas
      } else if (data) {
        createdItems.push(data);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${createdItems.length} lançamento(s) criado(s)`,
      items: createdItems 
    });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Atualizar lançamento
export async function PUT(request: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const authHeader = request.headers.get('authorization');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Configuração incompleta' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, authHeader || supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''));
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (updates.description !== undefined) updateData.description = toUpperCase(updates.description);
    if (updates.value !== undefined) updateData.value = updates.value;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.bank !== undefined) updateData.bank = updates.bank;
    if (updates.card !== undefined) updateData.card = updates.card;
    if (updates.autoConfirm !== undefined) updateData.auto_confirm = updates.autoConfirm;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { error } = await supabase
      .from('scheduled_transactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Erro ao atualizar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Excluir lançamento
export async function DELETE(request: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const authHeader = request.headers.get('authorization');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Configuração incompleta' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, authHeader || supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''));
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const { error } = await supabase
      .from('scheduled_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Erro ao excluir:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Função para criar tabela se não existir
async function ensureTableExists(supabase: any) {
  try {
    // Tentar selecionar para ver se a tabela existe
    const { error } = await supabase
      .from('scheduled_transactions')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      // Tabela não existe - não podemos criar via SDK, 
      // mas retornamos erro informando que precisa ser criada no Supabase
      console.warn('Tabela scheduled_transactions não existe. Crie no Supabase Dashboard.');
    }
  } catch (err) {
    console.warn('Erro ao verificar tabela:', err);
  }
}
