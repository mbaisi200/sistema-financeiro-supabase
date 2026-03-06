import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET - Exportar backup
export async function GET(request: NextRequest) {
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

    // Obter user_id da query string
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id é obrigatório.' }, { status: 400 });
    }

    // Buscar todos os dados do usuário
    const [banksResult, categoriesResult, cardsResult, transactionsResult, ccTransactionsResult] = await Promise.all([
      supabase.from('banks').select('*').eq('user_id', userId),
      supabase.from('categories').select('*').eq('user_id', userId),
      supabase.from('credit_cards').select('*').eq('user_id', userId),
      supabase.from('transactions').select('*').eq('user_id', userId),
      supabase.from('credit_card_transactions').select('*').eq('user_id', userId)
    ]);

    const backup = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      userId: userId,
      data: {
        banks: banksResult.data || [],
        categories: categoriesResult.data || [],
        creditCards: cardsResult.data || [],
        transactions: transactionsResult.data || [],
        creditCardTransactions: ccTransactionsResult.data || []
      },
      stats: {
        banks: (banksResult.data || []).length,
        categories: (categoriesResult.data || []).length,
        creditCards: (cardsResult.data || []).length,
        transactions: (transactionsResult.data || []).length,
        creditCardTransactions: (ccTransactionsResult.data || []).length
      }
    };

    return NextResponse.json(backup);

  } catch (error) {
    console.error('Erro ao criar backup:', error);
    return NextResponse.json({
      error: 'Erro ao criar backup: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}

// POST - Restaurar backup
export async function POST(request: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY necessária para restore.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await request.json();
    const { userId, data, mode = 'merge' } = body; // mode: 'merge' ou 'replace'

    if (!userId || !data) {
      return NextResponse.json({ error: 'userId e data são obrigatórios.' }, { status: 400 });
    }

    const results = {
      banks: { inserted: 0, errors: [] as string[] },
      categories: { inserted: 0, errors: [] as string[] },
      creditCards: { inserted: 0, errors: [] as string[] },
      transactions: { inserted: 0, errors: [] as string[] },
      creditCardTransactions: { inserted: 0, errors: [] as string[] }
    };

    // Se modo 'replace', excluir dados existentes primeiro
    if (mode === 'replace') {
      await supabaseAdmin.from('transactions').delete().eq('user_id', userId);
      await supabaseAdmin.from('credit_card_transactions').delete().eq('user_id', userId);
      await supabaseAdmin.from('credit_cards').delete().eq('user_id', userId);
      await supabaseAdmin.from('categories').delete().eq('user_id', userId);
      await supabaseAdmin.from('banks').delete().eq('user_id', userId);
    }

    // Inserir bancos
    if (data.banks && data.banks.length > 0) {
      for (const bank of data.banks) {
        const { error } = await supabaseAdmin.from('banks').insert({
          user_id: userId,
          name: bank.name,
          icon: bank.icon || '🏦',
          initial_balance: bank.initial_balance || 0
        });
        if (error) {
          results.banks.errors.push(`Banco "${bank.name}": ${error.message}`);
        } else {
          results.banks.inserted++;
        }
      }
    }

    // Inserir categorias
    if (data.categories && data.categories.length > 0) {
      for (const cat of data.categories) {
        const { error } = await supabaseAdmin.from('categories').insert({
          user_id: userId,
          name: cat.name,
          icon: cat.icon || '📦'
        });
        if (error) {
          results.categories.errors.push(`Categoria "${cat.name}": ${error.message}`);
        } else {
          results.categories.inserted++;
        }
      }
    }

    // Inserir cartões de crédito
    if (data.creditCards && data.creditCards.length > 0) {
      for (const card of data.creditCards) {
        const { error } = await supabaseAdmin.from('credit_cards').insert({
          user_id: userId,
          name: card.name,
          bank: card.bank || null,
          credit_limit: card.credit_limit || 0,
          icon: card.icon || '💳'
        });
        if (error) {
          results.creditCards.errors.push(`Cartão "${card.name}": ${error.message}`);
        } else {
          results.creditCards.inserted++;
        }
      }
    }

    // Inserir transações
    if (data.transactions && data.transactions.length > 0) {
      for (const trans of data.transactions) {
        const { error } = await supabaseAdmin.from('transactions').insert({
          user_id: userId,
          date: trans.date,
          description: trans.description,
          bank: trans.bank,
          type: trans.type,
          category: trans.category,
          value: trans.value
        });
        if (error) {
          results.transactions.errors.push(`Transação "${trans.description}": ${error.message}`);
        } else {
          results.transactions.inserted++;
        }
      }
    }

    // Inserir transações de cartão
    if (data.creditCardTransactions && data.creditCardTransactions.length > 0) {
      for (const trans of data.creditCardTransactions) {
        const { error } = await supabaseAdmin.from('credit_card_transactions').insert({
          user_id: userId,
          date: trans.date,
          description: trans.description,
          card: trans.card,
          category: trans.category,
          value: trans.value,
          is_payment: trans.is_payment || false
        });
        if (error) {
          results.creditCardTransactions.errors.push(`Transação cartão "${trans.description}": ${error.message}`);
        } else {
          results.creditCardTransactions.inserted++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Backup restaurado com sucesso!',
      results
    });

  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    return NextResponse.json({
      error: 'Erro ao restaurar backup: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}
