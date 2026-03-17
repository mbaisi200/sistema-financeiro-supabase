import { NextRequest, NextResponse } from 'next/server';
import { toUpperCase } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Confirmar lançamento futuro e criar transação
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

    const body = await request.json();
    const { 
      scheduledId, 
      confirmedValue, 
      confirmedDate,
      confirmedDescription 
    } = body;

    if (!scheduledId) {
      return NextResponse.json({ error: 'ID do lançamento é obrigatório' }, { status: 400 });
    }

    // Buscar lançamento agendado
    const { data: scheduled, error: fetchError } = await supabase
      .from('scheduled_transactions')
      .select('*')
      .eq('id', scheduledId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !scheduled) {
      return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 });
    }

    const value = confirmedValue || scheduled.value;
    const date = confirmedDate || scheduled.due_date;
    const description = confirmedDescription || scheduled.description;

    // Criar transação
    if (scheduled.card) {
      // Transação de cartão de crédito
      const { error: txError } = await supabase
        .from('credit_card_transactions')
        .insert({
          user_id: user.id,
          date: date,
          description: toUpperCase(description),
          card: scheduled.card,
          category: scheduled.category,
          value: value,
          is_payment: false
        });

      if (txError) {
        console.error('Erro ao criar transação de cartão:', txError);
        return NextResponse.json({ error: 'Erro ao criar transação: ' + txError.message }, { status: 500 });
      }
    } else if (scheduled.bank) {
      // Transação bancária
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          date: date,
          description: toUpperCase(description),
          bank: scheduled.bank,
          type: 'debit',
          category: scheduled.category,
          value: value
        });

      if (txError) {
        console.error('Erro ao criar transação bancária:', txError);
        return NextResponse.json({ error: 'Erro ao criar transação: ' + txError.message }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Lançamento sem banco ou cartão definido' }, { status: 400 });
    }

    // Atualizar status do lançamento agendado
    const { error: updateError } = await supabase
      .from('scheduled_transactions')
      .update({ 
        status: 'confirmed', 
        is_paid: true 
      })
      .eq('id', scheduledId);

    if (updateError) {
      console.error('Erro ao atualizar lançamento:', updateError);
      // Não falha aqui, a transação já foi criada
    }

    // Se for recorrente, criar próximo lançamento
    if (scheduled.type === 'recurring') {
      const nextDueDate = new Date(scheduled.due_date);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      
      await supabase
        .from('scheduled_transactions')
        .insert({
          user_id: user.id,
          description: scheduled.description.replace(/\(\d+\/\d+\)/, '').trim(),
          type: 'recurring',
          value: scheduled.value,
          total_installments: 999,
          current_installment: scheduled.current_installment + 1,
          due_date: nextDueDate.toISOString().split('T')[0],
          category: scheduled.category,
          bank: scheduled.bank,
          card: scheduled.card,
          auto_confirm: scheduled.auto_confirm,
          status: 'pending',
          is_paid: false
        });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Lançamento confirmado com sucesso!',
      transactionCreated: true
    });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
