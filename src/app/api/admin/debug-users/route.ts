import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_EMAILS } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Debug - listar usuários do Auth e da tabela
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

    // Verificar se é admin
    const adminEmailsLower = ADMIN_EMAILS.map(e => e.toLowerCase());
    if (!adminEmailsLower.includes((adminEmail || '').toLowerCase())) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    // Listar usuários do Auth
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    // Listar usuários da tabela
    const { data: tableUsers, error: tableError } = await supabaseAdmin
      .from('users')
      .select('*');

    return NextResponse.json({
      auth: {
        count: authUsers?.users?.length || 0,
        error: authError?.message || null,
        users: (authUsers?.users || []).map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at
        }))
      },
      table: {
        count: (tableUsers || []).length,
        error: tableError?.message || null,
        users: (tableUsers || []).map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          expires_at: u.expires_at
        }))
      },
      comparison: {
        authIds: (authUsers?.users || []).map(u => u.id),
        tableIds: (tableUsers || []).map(u => u.id),
        missingInTable: (authUsers?.users || [])
          .filter(au => !(tableUsers || []).some(tu => tu.id === au.id))
          .map(u => ({ id: u.id, email: u.email }))
      }
    });

  } catch (error) {
    console.error('[DEBUG] Erro:', error);
    return NextResponse.json({
      error: 'Erro interno: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}
