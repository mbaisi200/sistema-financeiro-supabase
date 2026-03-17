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
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Verificar se tem Service Role Key
    const hasServiceRole = !!supabaseServiceKey;

    if (!supabaseUrl) {
      console.error('NEXT_PUBLIC_SUPABASE_URL não definido');
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta: URL do Supabase não definida.' },
        { status: 500 }
      );
    }

    // Se não tem Service Role Key, retorna instrução
    if (!hasServiceRole) {
      return NextResponse.json({
        error: '⚠️ Configuração necessária: SUPABASE_SERVICE_ROLE_KEY não definida.',
        instructions: {
          step1: 'Acesse: https://supabase.com/dashboard/project/nqvlgvgxzfkskwwrshpj/settings/api',
          step2: 'Copie a chave "service_role" (NÃO a anon key)',
          step3: 'Adicione ao arquivo .env.local: SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui',
          step4: 'Reinicie o servidor'
        },
        note: 'A Service Role Key é necessária para criar usuários via API.'
      }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey!, {
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

      // Verificar se o usuário já existe na tabela users
      const { data: existingUser, error: existingUserError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingUserError) {
        console.error('Erro ao verificar usuário existente:', existingUserError);
      }

      if (existingUser) {
        return NextResponse.json(
          { error: 'Este email já está cadastrado no sistema.' },
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
            { error: 'Este email já está cadastrado no sistema de autenticação.' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: authError.message || 'Erro ao criar usuário' },
          { status: 400 }
        );
      }

      const newUid = authData.user.id;

      // Criar/atualizar registro na tabela users
      const { data: insertedUser, error: userInsertError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: newUid,
          email: normalizedEmail,
          created_by: adminEmail,
          expires_at: expiresAt || null
        })
        .select();

      if (userInsertError) {
        console.error('Erro ao criar registro de usuário:', userInsertError);
        // Não falha aqui, o usuário foi criado no Auth
      } else {
        console.log('Usuário criado na tabela users:', insertedUser);
      }

      // Inicializar dados padrão
      for (const bank of Object.values(DEFAULT_BANKS)) {
        await supabaseAdmin.from('banks').insert({
          user_id: newUid,
          name: bank.name,
          icon: bank.icon,
          initial_balance: bank.initialBalance
        }).select();
      }

      for (const cat of Object.values(DEFAULT_CATEGORIES)) {
        await supabaseAdmin.from('categories').insert({
          user_id: newUid,
          name: cat.name,
          icon: cat.icon
        }).select();
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

      console.log('[UPDATE USER] Iniciando atualização:', { uid, email: normalizedEmail, expiresAt });

      // Verificar se o usuário existe na tabela users
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from('users')
        .select('id, email, expires_at')
        .eq('id', uid)
        .maybeSingle();

      if (checkError) {
        console.error('[UPDATE USER] Erro ao verificar usuário:', checkError);
        return NextResponse.json(
          { error: 'Erro ao verificar usuário: ' + checkError.message },
          { status: 500 }
        );
      }

      if (!existingUser) {
        console.error('[UPDATE USER] Usuário não encontrado na tabela users:', uid);
        
        // Tentar criar o registro na tabela users se não existir
        const { data: newUser, error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: uid,
            email: normalizedEmail,
            expires_at: expiresAt || null
          })
          .select()
          .single();

        if (insertError) {
          console.error('[UPDATE USER] Erro ao criar registro de usuário:', insertError);
          return NextResponse.json(
            { error: 'Usuário não encontrado na tabela e não foi possível criar o registro: ' + insertError.message },
            { status: 500 }
          );
        }

        console.log('[UPDATE USER] Registro criado:', newUser);
        return NextResponse.json({
          success: true,
          uid,
          email: normalizedEmail,
          message: 'Registro de usuário criado e data de validade definida!',
          data: newUser
        });
      }

      console.log('[UPDATE USER] Usuário encontrado:', existingUser);

      // Atualizar dados do usuário
      const updateData: { expires_at?: string | null } = {};
      if (expiresAt !== undefined) {
        updateData.expires_at = expiresAt || null;
      }

      console.log('[UPDATE USER] Dados para atualização:', updateData);

      const { data: updatedData, error: updateError, count } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', uid)
        .select();

      console.log('[UPDATE USER] Resultado da atualização:', { updatedData, updateError, count });

      if (updateError) {
        console.error('[UPDATE USER] Erro ao atualizar usuário:', updateError);
        return NextResponse.json(
          { error: 'Erro ao atualizar usuário: ' + updateError.message },
          { status: 500 }
        );
      }

      // Verificar se realmente atualizou algum registro
      if (!updatedData || updatedData.length === 0) {
        console.error('[UPDATE USER] Nenhum registro foi atualizado para uid:', uid);
        return NextResponse.json(
          { error: 'Nenhum registro foi atualizado. Verifique se o usuário existe na tabela.' },
          { status: 500 }
        );
      }

      console.log('[UPDATE USER] Atualização realizada com sucesso:', updatedData[0]);

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
        message: 'Usuário atualizado com sucesso!',
        data: updatedData[0]
      });
    }

    return NextResponse.json({ error: 'Operação inválida.' }, { status: 400 });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
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
      return NextResponse.json({ error: 'Configuração incompleta: SUPABASE_SERVICE_ROLE_KEY necessária.' }, { status: 500 });
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
