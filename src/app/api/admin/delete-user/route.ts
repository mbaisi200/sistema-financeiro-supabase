import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_EMAILS } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.'
      }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { uid, email, adminEmail } = await request.json();

    // Verificar se é admin
    if (!ADMIN_EMAILS.includes(adminEmail)) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    // Não permitir excluir admin
    if (ADMIN_EMAILS.includes(email)) {
      return NextResponse.json({ error: 'Não é possível excluir um administrador.' }, { status: 400 });
    }

    if (!uid) {
      return NextResponse.json({ error: 'UID é obrigatório.' }, { status: 400 });
    }

    console.log(`[DELETE USER] Iniciando exclusão do usuário: ${email} (${uid})`);

    // 1. Excluir transações
    const { error: transError } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('user_id', uid);

    if (transError) {
      console.error('[DELETE USER] Erro ao excluir transações:', transError);
    } else {
      console.log('[DELETE USER] Transações excluídas');
    }

    // 2. Excluir transações de cartão de crédito
    const { error: ccTransError } = await supabaseAdmin
      .from('credit_card_transactions')
      .delete()
      .eq('user_id', uid);

    if (ccTransError) {
      console.error('[DELETE USER] Erro ao excluir transações de cartão:', ccTransError);
    } else {
      console.log('[DELETE USER] Transações de cartão excluídas');
    }

    // 3. Excluir cartões de crédito
    const { error: cardsError } = await supabaseAdmin
      .from('credit_cards')
      .delete()
      .eq('user_id', uid);

    if (cardsError) {
      console.error('[DELETE USER] Erro ao excluir cartões:', cardsError);
    } else {
      console.log('[DELETE USER] Cartões excluídos');
    }

    // 4. Excluir categorias
    const { error: catError } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('user_id', uid);

    if (catError) {
      console.error('[DELETE USER] Erro ao excluir categorias:', catError);
    } else {
      console.log('[DELETE USER] Categorias excluídas');
    }

    // 5. Excluir bancos
    const { error: banksError } = await supabaseAdmin
      .from('banks')
      .delete()
      .eq('user_id', uid);

    if (banksError) {
      console.error('[DELETE USER] Erro ao excluir bancos:', banksError);
    } else {
      console.log('[DELETE USER] Bancos excluídos');
    }

    // 6. Excluir registro da tabela users
    const { error: userError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', uid);

    if (userError) {
      console.error('[DELETE USER] Erro ao excluir registro de usuário:', userError);
      return NextResponse.json({ error: 'Erro ao excluir registro do usuário.' }, { status: 500 });
    }

    console.log('[DELETE USER] Registro de usuário excluído');

    // 7. Excluir usuário do Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(uid);

    if (authError) {
      console.error('[DELETE USER] Erro ao excluir do Auth:', authError);
      // Não retorna erro aqui porque os dados já foram excluídos
    } else {
      console.log('[DELETE USER] Usuário excluído do Auth');
    }

    console.log(`[DELETE USER] Usuário ${email} excluído com sucesso!`);

    return NextResponse.json({
      success: true,
      message: `Usuário ${email} excluído com sucesso! Todos os dados foram removidos.`
    });

  } catch (error) {
    console.error('[DELETE USER] Erro:', error);
    return NextResponse.json({
      error: 'Erro interno no servidor: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}
