import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_EMAILS, DEFAULT_BANKS, DEFAULT_CATEGORIES } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Sincronizar usuários do Supabase Auth com a tabela users
export async function POST(request: NextRequest) {
  try {
    console.log('[SYNC] Iniciando sincronização...');

    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[SYNC] Credenciais não configuradas');
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY necessária.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { adminEmail } = await request.json();

    // Verificar se é admin (case-insensitive)
    const adminEmailsLower = ADMIN_EMAILS.map(e => e.toLowerCase());
    if (!adminEmailsLower.includes((adminEmail || '').toLowerCase())) {
      console.error('[SYNC] Não autorizado:', adminEmail);
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    console.log('[SYNC] Admin verificado:', adminEmail);

    // 1. Listar todos os usuários do Supabase Auth
    console.log('[SYNC] Listando usuários do Auth...');
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('[SYNC] Erro ao listar usuários Auth:', authError);
      return NextResponse.json({ error: 'Erro ao listar usuários: ' + authError.message }, { status: 500 });
    }

    console.log(`[SYNC] Encontrados ${authUsers.users.length} usuários no Auth`);

    // 2. Listar usuários na tabela users
    console.log('[SYNC] Listando tabela users...');
    const { data: tableUsers, error: tableError } = await supabaseAdmin
      .from('users')
      .select('id, email');

    if (tableError) {
      console.error('[SYNC] Erro ao listar tabela users:', tableError);
    }

    const tableUserIds = new Set((tableUsers || []).map(u => u.id));
    console.log(`[SYNC] Encontrados ${(tableUsers || []).length} usuários na tabela users`);

    // 3. Sincronizar - adicionar usuários que estão no Auth mas não na tabela
    const syncedUsers: string[] = [];
    const errors: { email: string; error: string }[] = [];

    for (const authUser of authUsers.users) {
      if (!tableUserIds.has(authUser.id)) {
        console.log(`[SYNC] Sincronizando usuário: ${authUser.email} (${authUser.id})`);

        // Inserir na tabela users
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            created_by: adminEmail,
            expires_at: null
          });

        if (insertError) {
          console.error(`[SYNC] Erro ao inserir ${authUser.email}:`, insertError);
          errors.push({ email: authUser.email || '', error: insertError.message });
        } else {
          syncedUsers.push(authUser.email || '');
          console.log(`[SYNC] Usuário ${authUser.email} inserido com sucesso`);

          // Criar dados padrão para o usuário
          try {
            for (const bank of Object.values(DEFAULT_BANKS)) {
              await supabaseAdmin.from('banks').insert({
                user_id: authUser.id,
                name: bank.name,
                icon: bank.icon,
                initial_balance: bank.initialBalance
              });
            }

            for (const cat of Object.values(DEFAULT_CATEGORIES)) {
              await supabaseAdmin.from('categories').insert({
                user_id: authUser.id,
                name: cat.name,
                icon: cat.icon
              });
            }
            console.log(`[SYNC] Dados padrão criados para ${authUser.email}`);
          } catch (dataError) {
            console.error(`[SYNC] Erro ao criar dados padrão:`, dataError);
          }
        }
      }
    }

    console.log(`[SYNC] Sincronização concluída. Sincronizados: ${syncedUsers.length}, Erros: ${errors.length}`);

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída!`,
      authUsers: authUsers.users.length,
      tableUsers: (tableUsers || []).length,
      synced: syncedUsers.length,
      syncedUsers,
      errors
    });

  } catch (error) {
    console.error('[SYNC] Erro geral:', error);
    return NextResponse.json({
      error: 'Erro interno: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}
