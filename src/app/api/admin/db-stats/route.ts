import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_EMAILS } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Estimativa de bytes por linha por tabela (baseado em PostgreSQL)
const ROW_SIZE_ESTIMATES: Record<string, number> = {
  banks: 150,
  categories: 200,
  credit_cards: 250,
  transactions: 400,
  credit_card_transactions: 350,
  scheduled_transactions: 500
};

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
    const clientEmail = searchParams.get('clientEmail');

    const adminEmailsLower = ADMIN_EMAILS.map(e => e.toLowerCase());
    if (!adminEmailsLower.includes((adminEmail || '').toLowerCase())) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const tables = ['banks', 'categories', 'credit_cards', 'transactions', 'credit_card_transactions', 'scheduled_transactions'];

    let stats: { clientEmail: string; clientId: string; stats: Record<string, number>; total: number; sizeMB: number }[] = [];
    let totalStats: Record<string, number> = {};
    let totalSizeMB = 0;

    if (clientEmail) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('email', clientEmail)
        .single();

      if (userError || !userData) {
        return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
      }

      const clientStats: Record<string, number> = {};
      let clientTotal = 0;
      let clientSizeBytes = 0;

      for (const table of tables) {
        const { count, error } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userData.id);

        if (error) {
          console.error(`[DB-STATS] Erro ao contar ${table}:`, error);
          clientStats[table] = 0;
        } else {
          clientStats[table] = count || 0;
          clientSizeBytes += (count || 0) * ROW_SIZE_ESTIMATES[table];
        }
        clientTotal += clientStats[table];
      }

      stats = [{ clientEmail: userData.email, clientId: userData.id, stats: clientStats, total: clientTotal, sizeMB: parseFloat((clientSizeBytes / (1024 * 1024)).toFixed(2)) }];
      totalStats = clientStats;
      totalSizeMB = stats[0].sizeMB;
    } else {
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, email');

      if (usersError) {
        return NextResponse.json({ error: usersError.message }, { status: 500 });
      }

      for (const table of tables) {
        totalStats[table] = 0;
      }

      for (const u of users || []) {
        const clientStats: Record<string, number> = {};
        let clientTotal = 0;
        let clientSizeBytes = 0;

        for (const table of tables) {
          const { count, error } = await supabaseAdmin
            .from(table)
            .select('*', { count: 'exact', head: true })
            .eq('user_id', u.id);

          if (error) {
            console.error(`[DB-STATS] Erro ao contar ${table}:`, error);
            clientStats[table] = 0;
          } else {
            clientStats[table] = count || 0;
            clientSizeBytes += (count || 0) * ROW_SIZE_ESTIMATES[table];
          }
          clientTotal += clientStats[table];
          totalStats[table] = (totalStats[table] || 0) + clientStats[table];
        }

        const sizeMB = parseFloat((clientSizeBytes / (1024 * 1024)).toFixed(2));
        stats.push({ clientEmail: u.email, clientId: u.id, stats: clientStats, total: clientTotal, sizeMB });
        totalSizeMB += sizeMB;
      }

      stats.sort((a, b) => a.clientEmail.localeCompare(b.clientEmail));
    }

    const response = NextResponse.json({
      stats,
      totalStats,
      totalSizeMB: parseFloat(totalSizeMB.toFixed(2)),
      tables,
      clientEmail: clientEmail || null
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('CDN-Cache-Control', 'no-store');

    return response;

  } catch (error) {
    console.error('[DB-STATS] Erro geral:', error);
    return NextResponse.json({
      error: 'Erro interno: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}
