import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_EMAILS } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Listar todos os usuários da tabela users
export async function GET(request: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY necessária.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { searchParams } = new URL(request.url);
    const adminEmail = searchParams.get('adminEmail');

    // Verificar se é admin (case-insensitive)
    const adminEmailsLower = ADMIN_EMAILS.map(e => e.toLowerCase());
    if (!adminEmailsLower.includes((adminEmail || '').toLowerCase())) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    // Listar usuários da tabela users - EXATAMENTE IGUAL AO DEBUG-USERS
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*');

    if (error) {
      console.error('[LIST-USERS] Erro:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Listar pending_users também
    const { data: pendingUsers, error: pendingError } = await supabaseAdmin
      .from('pending_users')
      .select('*');

    if (pendingError) {
      console.error('[LIST-USERS] Erro ao carregar pendentes:', pendingError);
    }

    console.log('[LIST-USERS] Retornando', users?.length || 0, 'usuários');
    console.log('[LIST-USERS] Emails:', users?.map(u => u.email).join(', '));

    // Adicionar is_admin baseado no ADMIN_EMAILS
    const usersWithAdmin = (users || []).map(u => ({
      ...u,
      is_admin: adminEmailsLower.includes((u.email || '').toLowerCase())
    }));

    const response = NextResponse.json({
      users: usersWithAdmin,
      pendingUsers: pendingUsers || [],
      _timestamp: new Date().toISOString()
    });

    // Headers para evitar cache
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('CDN-Cache-Control', 'no-store');

    return response;

  } catch (error) {
    console.error('[LIST-USERS] Erro geral:', error);
    return NextResponse.json({
      error: 'Erro interno: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}
