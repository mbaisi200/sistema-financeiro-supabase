import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_EMAILS, DEFAULT_BANKS, DEFAULT_CATEGORIES } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface CreateUserData {
  email: string;
  password: string;
  adminEmail: string;
  expiresAt?: string;
  operation?: 'create' | 'update';
  uid?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Import Supabase dinamicamente para evitar erro de build
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { email, password, adminEmail, expiresAt, operation = 'create', uid }: CreateUserData = await request.json();

    // Verify admin
    if (!ADMIN_EMAILS.includes(adminEmail)) {
      return NextResponse.json(
        { error: 'Não autorizado. Apenas administradores podem realizar esta ação.' },
        { status: 403 }
      );
    }

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (operation === 'create') {
      // Criar novo usuário
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: 'A senha deve ter pelo menos 6 caracteres.' },
          { status: 400 }
        );
      }

      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true
      });

      if (authError) {
        console.error('Supabase Auth Error:', authError);
        if (authError.message.includes('already been registered')) {
          return NextResponse.json(
            { error: 'Este email já está cadastrado no sistema.' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: authError.message || 'Erro ao criar usuário' },
          { status: 400 }
        );
      }

      const newUid = authData.user.id;

      // Atualizar documento do usuário com dados adicionais
      await supabaseAdmin.from('users').update({
        created_by: adminEmail,
        expires_at: expiresAt || null
      }).eq('id', newUid);

      // Inicializar dados padrão
      for (const bank of Object.values(DEFAULT_BANKS)) {
        await supabaseAdmin.from('banks').insert({
          user_id: newUid,
          name: bank.name,
          icon: bank.icon,
          initial_balance: bank.initialBalance
        });
      }
      
      for (const cat of Object.values(DEFAULT_CATEGORIES)) {
        await supabaseAdmin.from('categories').insert({
          user_id: newUid,
          name: cat.name,
          icon: cat.icon
        });
      }

      return NextResponse.json({
        success: true,
        uid: newUid,
        email: normalizedEmail,
        message: 'Usuário criado com sucesso!'
      });

    } else if (operation === 'update') {
      // Atualizar usuário existente
      if (!uid) {
        return NextResponse.json(
          { error: 'UID é obrigatório para atualização.' },
          { status: 400 }
        );
      }

      // Atualizar dados do usuário
      const updateData: { expires_at?: string | null } = {};
      if (expiresAt !== undefined) {
        updateData.expires_at = expiresAt || null;
      }

      await supabaseAdmin.from('users').update(updateData).eq('id', uid);

      // Se fornecer senha, atualizar via Supabase Auth
      if (password && password.length >= 6) {
        await supabaseAdmin.auth.admin.updateUserById(uid, {
          password: password
        });
      }

      return NextResponse.json({
        success: true,
        uid,
        email: normalizedEmail,
        message: 'Usuário atualizado com sucesso!'
      });
    }

    return NextResponse.json({ error: 'Operação inválida.' }, { status: 400 });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuração incompleta.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const adminEmail = searchParams.get('adminEmail');

    if (!ADMIN_EMAILS.includes(adminEmail || '')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    if (!uid) {
      return NextResponse.json({ error: 'UID é obrigatório.' }, { status: 400 });
    }

    const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', uid)
      .single();

    if (error || !userData) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      uid,
      ...userData
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
