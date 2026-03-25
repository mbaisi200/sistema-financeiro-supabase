import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_EMAILS } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Listar todos os usuários da tabela users (usando Service Role Key para ignorar RLS)
export async function GET(request: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY necessária.' }, { status: 500 });
    }

    // Criar cliente admin com Service Role Key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const adminEmail = request.nextUrl.searchParams.get('adminEmail');

    // Verificar se é admin (case-insensitive)
    const adminEmailsLower = ADMIN_EMAILS.map(e => e.toLowerCase());
    if (!adminEmailsLower.includes((adminEmail || '').toLowerCase())) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    // Listar todos os usuários da tabela users
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('email');

    if (error) {
      console.error('[LIST-USERS] Erro:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Listar pending_users também
    const { data: pendingUsers, error: pendingError } = await supabaseAdmin
      .from('pending_users')
      .select('*')
      .order('email');

    if (pendingError) {
      console.error('[LIST-USERS] Erro ao carregar pendentes:', pendingError);
    }

    console.log('[LIST-USERS] Retornando', users?.length || 0, 'usuários');

    return NextResponse.json({
      users: users || [],
      pendingUsers: pendingUsers || []
    });

  } catch (error) {
    console.error('[LIST-USERS] Erro geral:', error);
    return NextResponse.json({
      error: 'Erro interno: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}
