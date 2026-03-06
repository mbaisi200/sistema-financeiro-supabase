import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_EMAILS } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Dados de demonstração realistas para sistema financeiro
const DEMO_BANKS = [
  { name: 'BANCO DO BRASIL', icon: '🏦', initial_balance: 5000 },
  { name: 'NUBANK', icon: '💜', initial_balance: 2500 },
  { name: 'ITAU', icon: '🟠', initial_balance: 3500 },
  { name: 'BRADESCO', icon: '🔴', initial_balance: 1800 },
  { name: 'SANTANDER', icon: '🔴', initial_balance: 2200 },
  { name: 'INTER', icon: '🟠', initial_balance: 1000 },
  { name: 'C6 BANK', icon: '⚫', initial_balance: 800 },
  { name: 'PICPAY', icon: '💚', initial_balance: 500 },
];

const DEMO_CATEGORIES = [
  { name: 'SALARIO', icon: '💰' },
  { name: 'FREELA', icon: '💻' },
  { name: 'INVESTIMENTOS', icon: '📈' },
  { name: 'ALIMENTACAO', icon: '🍔' },
  { name: 'MERCADO', icon: '🛒' },
  { name: 'TRANSPORTE', icon: '🚗' },
  { name: 'UBER/99', icon: '🚕' },
  { name: 'MORADIA', icon: '🏠' },
  { name: 'ALUGUEL', icon: '🔑' },
  { name: 'ENERGIA', icon: '💡' },
  { name: 'AGUA', icon: '💧' },
  { name: 'INTERNET', icon: '📶' },
  { name: 'TELEFONE', icon: '📱' },
  { name: 'STREAMING', icon: '🎬' },
  { name: 'NETFLIX', icon: '📺' },
  { name: 'SPOTIFY', icon: '🎵' },
  { name: 'ACADEMIA', icon: '🏋️' },
  { name: 'SAUDE', icon: '🏥' },
  { name: 'FARMACIA', icon: '💊' },
  { name: 'EDUCACAO', icon: '📚' },
  { name: 'CURSOS', icon: '🎓' },
  { name: 'LAZER', icon: '🎮' },
  { name: 'RESTAURANTE', icon: '🍕' },
  { name: 'PADARIA', icon: '🥖' },
  { name: 'ROUPAS', icon: '👕' },
  { name: 'PRESENTES', icon: '🎁' },
  { name: 'PET SHOP', icon: '🐕' },
  { name: 'VIAGEM', icon: '✈️' },
  { name: 'HOTEL', icon: '🏨' },
  { name: 'GASOLINA', icon: '⛽' },
  { name: 'MANUTENCAO CARRO', icon: '🔧' },
  { name: 'ESTACIONAMENTO', icon: '🅿️' },
  { name: 'CINEMA', icon: '🎞️' },
  { name: 'LIVROS', icon: '📖' },
  { name: 'COSMETICOS', icon: '💄' },
  { name: 'CABELEREIRO', icon: '💇' },
  { name: 'PAGAMENTO CARTAO', icon: '💳' },
  { name: 'EMPRESTIMO', icon: '🏦' },
  { name: 'SEGURO', icon: '🛡️' },
  { name: 'IMPOSTOS', icon: '📋' },
];

const DEMO_CREDIT_CARDS = [
  { name: 'NUBANK ROXINHO', bank: 'NUBANK', limit: 8000, icon: '💜' },
  { name: 'ITAU PLATINUM', bank: 'ITAU', limit: 12000, icon: '🟠' },
  { name: 'BB OUROCARD', bank: 'BANCO DO BRASIL', limit: 10000, icon: '🏦' },
  { name: 'SANTANDER FREE', bank: 'SANTANDER', limit: 6000, icon: '🔴' },
  { name: 'C6 CARBON', bank: 'C6 BANK', limit: 15000, icon: '⚫' },
];

// Descrições de transações realistas
const INCOME_DESCRIPTIONS = [
  'Salario Empresa XYZ',
  'Pagamento Freelance',
  'Rendimento Poupanca',
  'Dividendos Acoes',
  'Rendimento CDB',
  'Bonus Trimestral',
  'Hora Extra',
  'Reembolso Empresa',
  'Venda Produto',
  'Servico Consultoria',
  'Comissao Vendas',
  'Decimo Terceiro',
  'Ferias Proporcionais',
];

const EXPENSE_DESCRIPTIONS: Record<string, string[]> = {
  'ALIMENTACAO': [
    'Restaurante Sabor Caseiro',
    'Lanche Shopping',
    'Pizza Hut',
    'McDonalds',
    'Habibs',
    'Bob\'s',
    'Spoleto',
    'Giraffas',
    'Subway',
    'China in Box',
    'Japones',
    'Churrascaria',
    'Padaria Central',
    'Cafe da Manha',
    'Almoco Trabalho',
  ],
  'MERCADO': [
    'Carrefour',
    'Extra',
    'Pao de Acucar',
    'Assai',
    'Atakarejo',
    'Minuto Pao de Acucar',
    'Dia',
    'Mercado Livre',
    'Compras Mes',
    'Hortifruti',
    'Açougue',
  ],
  'TRANSPORTE': [
    'Posto Shell',
    'Posto Ipiranga',
    'Posto Petrobras',
    'Estacionamento',
    'Pedagio',
    'Lava Rapido',
    'Troca Oleo',
    'Revisao Carro',
    'IPVA',
    'Licenciamento',
  ],
  'UBER/99': [
    'Uber Casa-Trabalho',
    '99 Pop',
    'Uber BhShop',
    'Uber Noite',
    'Cabify',
  ],
  'MORADIA': [
    'Aluguel Apartamento',
    'Condominio',
    'IPTU',
    'Manutencao Predio',
  ],
  'ENERGIA': [
    'Conta Luz',
    'Energia Eletrica',
    'Cemig',
    'Light',
    'Enel',
  ],
  'AGUA': [
    'Conta Agua',
    'Copasa',
    'Sabesp',
    'Saneamento',
  ],
  'INTERNET': [
    'Vivo Fibra',
    'Claro Net',
    'Oi Fibra',
    'Internet Mensal',
  ],
  'TELEFONE': [
    'Claro Celular',
    'Vivo Celular',
    'Tim',
    'Oi',
    'Recarga Celular',
  ],
  'STREAMING': [
    'Netflix',
    'Amazon Prime',
    'Disney+',
    'HBO Max',
    'Globoplay',
    'YouTube Premium',
  ],
  'SPOTIFY': [
    'Spotify Premium',
    'Apple Music',
    'Deezer',
  ],
  'ACADEMIA': [
    'Mensalidade Academia',
    'Smart Fit',
    'Body Tech',
    'Fitness',
  ],
  'SAUDE': [
    'Plano de Saude',
    'Unimed',
    'Amil',
    'Bradesco Saude',
    'Consulta Medica',
    'Exames',
  ],
  'FARMACIA': [
    'Drogasil',
    'Pague Menos',
    'Panvel',
    'Raia',
    'Sao Joao',
    'Medicamentos',
  ],
  'EDUCACAO': [
    'Mensalidade Faculdade',
    'Material Escolar',
    'Livros Didaticos',
  ],
  'CURSOS': [
    'Udemy',
    'Alura',
    'Coursera',
    'Curso Ingles',
    'Pos Graduacao',
    'MBA',
  ],
  'LAZER': [
    'Cinema',
    'Teatro',
    'Show',
    'Parque',
    'Bowling',
    'Kart',
  ],
  'ROUPAS': [
    'Renner',
    'C&A',
    'Riachuelo',
    'Marisa',
    'Zara',
    'H&M',
    'Calcadatos',
  ],
  'PRESENTES': [
    'Presente Aniversario',
    'Presente Dia Namorados',
    'Presente Mae',
    'Presente Pai',
    'Presente Natal',
  ],
  'PET SHOP': [
    'Racao Pet',
    'Petshop',
    'Veterinario',
    'Banho Pet',
  ],
  'VIAGEM': [
    'Passagem Aerea',
    'Hotel',
    'Pousada',
    'Resort',
    'Aluguel Carro',
    'Passeio Turistico',
  ],
  'COSMETICOS': [
    'Boticario',
    'Quem Disse Berenice',
    'Mac',
    'Sephora',
    'Perfumaria',
  ],
  'CABELEREIRO': [
    'Corte Cabelo',
    'Barbearia',
    'Salao Beleza',
    'Manicure',
  ],
};

// Função para gerar data aleatória nos últimos 12 meses
function randomDate(monthsAgo: number = 12): string {
  const now = new Date();
  const past = new Date();
  past.setMonth(past.getMonth() - monthsAgo);

  const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime());
  const randomDate = new Date(randomTime);

  return randomDate.toISOString().split('T')[0];
}

// Função para gerar valor aleatório dentro de um range
function randomValue(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// Função para escolher item aleatório de um array
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export async function POST(request: NextRequest) {
  try {
    console.log('[SEED-DEMO] Iniciando população de dados...');

    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY necessária.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { adminEmail, targetEmail } = await request.json();

    // Verificar se é admin (case-insensitive)
    const adminEmailsLower = ADMIN_EMAILS.map(e => e.toLowerCase());
    if (!adminEmailsLower.includes((adminEmail || '').toLowerCase())) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    // Buscar usuário alvo
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();

    if (userError) {
      return NextResponse.json({ error: 'Erro ao listar usuários: ' + userError.message }, { status: 500 });
    }

    const targetUser = users.users.find(u => u.email?.toLowerCase() === targetEmail?.toLowerCase());

    if (!targetUser) {
      return NextResponse.json({ error: `Usuário ${targetEmail} não encontrado no Auth.` }, { status: 404 });
    }

    console.log(`[SEED-DEMO] Usuário alvo: ${targetUser.email} (${targetUser.id})`);

    // Limpar dados existentes do usuário
    console.log('[SEED-DEMO] Limpando dados existentes...');

    await supabaseAdmin.from('credit_card_transactions').delete().eq('user_id', targetUser.id);
    await supabaseAdmin.from('transactions').delete().eq('user_id', targetUser.id);
    await supabaseAdmin.from('credit_cards').delete().eq('user_id', targetUser.id);
    await supabaseAdmin.from('categories').delete().eq('user_id', targetUser.id);
    await supabaseAdmin.from('banks').delete().eq('user_id', targetUser.id);

    // 1. Criar Bancos
    console.log('[SEED-DEMO] Criando bancos...');
    const banksMap: Record<string, string> = {};

    for (const bank of DEMO_BANKS) {
      const { data, error } = await supabaseAdmin
        .from('banks')
        .insert({
          user_id: targetUser.id,
          name: bank.name,
          icon: bank.icon,
          initial_balance: bank.initial_balance
        })
        .select('id')
        .single();

      if (!error && data) {
        banksMap[bank.name] = data.id;
      }
    }

    console.log(`[SEED-DEMO] ${Object.keys(banksMap).length} bancos criados`);

    // 2. Criar Categorias
    console.log('[SEED-DEMO] Criando categorias...');
    const categoriesMap: Record<string, string> = {};

    for (const cat of DEMO_CATEGORIES) {
      const { data, error } = await supabaseAdmin
        .from('categories')
        .insert({
          user_id: targetUser.id,
          name: cat.name,
          icon: cat.icon
        })
        .select('id')
        .single();

      if (!error && data) {
        categoriesMap[cat.name] = data.id;
      }
    }

    console.log(`[SEED-DEMO] ${Object.keys(categoriesMap).length} categorias criadas`);

    // 3. Criar Cartões de Crédito
    console.log('[SEED-DEMO] Criando cartões de crédito...');
    const cardsMap: Record<string, string> = {};

    for (const card of DEMO_CREDIT_CARDS) {
      const { data, error } = await supabaseAdmin
        .from('credit_cards')
        .insert({
          user_id: targetUser.id,
          name: card.name,
          bank: card.bank,
          credit_limit: card.limit,
          icon: card.icon
        })
        .select('id')
        .single();

      if (!error && data) {
        cardsMap[card.name] = data.id;
      }
    }

    console.log(`[SEED-DEMO] ${Object.keys(cardsMap).length} cartões criados`);

    // 4. Criar Transações (200+)
    console.log('[SEED-DEMO] Criando transações...');
    let transactionsCreated = 0;
    let ccTransactionsCreated = 0;

    const bankIds = Object.values(banksMap);
    const cardIds = Object.values(cardsMap);
    const cardNames = Object.keys(cardsMap);

    // Criar transações de receita (aproximadamente 20-30 transações)
    const incomeCategories = ['SALARIO', 'FREELA', 'INVESTIMENTOS'];
    const incomeBanks = ['BANCO DO BRASIL', 'NUBANK', 'ITAU'];

    for (let i = 0; i < 30; i++) {
      const category = randomItem(incomeCategories);
      const bankName = randomItem(incomeBanks);
      const bankId = banksMap[bankName];

      if (!bankId || !categoriesMap[category]) continue;

      let value: number;
      if (category === 'SALARIO') {
        value = randomValue(5500, 8500);
      } else if (category === 'FREELA') {
        value = randomValue(500, 3000);
      } else {
        value = randomValue(50, 500);
      }

      const { error } = await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: targetUser.id,
          date: randomDate(12),
          description: randomItem(INCOME_DESCRIPTIONS),
          bank: bankId,
          type: 'credit',
          category: categoriesMap[category],
          value: value
        });

      if (!error) transactionsCreated++;
    }

    // Criar transações de despesa em banco (aproximadamente 100 transações)
    const expenseCategories = Object.keys(EXPENSE_DESCRIPTIONS);

    for (let i = 0; i < 100; i++) {
      const category = randomItem(expenseCategories);
      const bankId = randomItem(bankIds);

      if (!bankId || !categoriesMap[category]) continue;

      const descriptions = EXPENSE_DESCRIPTIONS[category] || [category];
      let value: number;

      // Definir ranges de valor por categoria
      if (['ALUGUEL', 'MORADIA'].includes(category)) {
        value = randomValue(1200, 2500);
      } else if (['SAUDE', 'PLANO DE SAUDE'].includes(category)) {
        value = randomValue(300, 800);
      } else if (['ENERGIA', 'AGUA'].includes(category)) {
        value = randomValue(80, 300);
      } else if (['INTERNET', 'TELEFONE'].includes(category)) {
        value = randomValue(80, 200);
      } else if (['STREAMING', 'SPOTIFY', 'NETFLIX'].includes(category)) {
        value = randomValue(20, 60);
      } else if (['ACADEMIA'].includes(category)) {
        value = randomValue(80, 150);
      } else if (['MERCADO'].includes(category)) {
        value = randomValue(150, 600);
      } else if (['ALIMENTACAO', 'RESTAURANTE'].includes(category)) {
        value = randomValue(30, 150);
      } else if (['TRANSPORTE', 'GASOLINA'].includes(category)) {
        value = randomValue(50, 300);
      } else if (['UBER/99'].includes(category)) {
        value = randomValue(15, 80);
      } else if (['EDUCACAO', 'CURSOS'].includes(category)) {
        value = randomValue(50, 500);
      } else if (['LAZER', 'CINEMA'].includes(category)) {
        value = randomValue(30, 150);
      } else if (['ROUPAS'].includes(category)) {
        value = randomValue(80, 500);
      } else if (['VIAGEM', 'HOTEL'].includes(category)) {
        value = randomValue(200, 2000);
      } else if (['PET SHOP'].includes(category)) {
        value = randomValue(50, 200);
      } else {
        value = randomValue(20, 200);
      }

      const { error } = await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: targetUser.id,
          date: randomDate(12),
          description: randomItem(descriptions),
          bank: bankId,
          type: 'debit',
          category: categoriesMap[category],
          value: value
        });

      if (!error) transactionsCreated++;
    }

    // Criar transações de cartão de crédito (aproximadamente 100 transações)
    for (let i = 0; i < 100; i++) {
      const category = randomItem(expenseCategories);
      const cardId = randomItem(cardIds);

      if (!cardId || !categoriesMap[category]) continue;

      const descriptions = EXPENSE_DESCRIPTIONS[category] || [category];
      let value: number;

      // Cartão geralmente tem gastos menores, mas mais frequentes
      if (['ALIMENTACAO', 'RESTAURANTE'].includes(category)) {
        value = randomValue(25, 120);
      } else if (['MERCADO'].includes(category)) {
        value = randomValue(50, 300);
      } else if (['STREAMING', 'SPOTIFY', 'NETFLIX'].includes(category)) {
        value = randomValue(25, 55);
      } else if (['ROUPAS'].includes(category)) {
        value = randomValue(80, 400);
      } else if (['LAZER', 'CINEMA'].includes(category)) {
        value = randomValue(40, 120);
      } else if (['COSMETICOS', 'CABELEREIRO'].includes(category)) {
        value = randomValue(50, 250);
      } else if (['UBER/99'].includes(category)) {
        value = randomValue(15, 60);
      } else if (['APRESENTES'].includes(category)) {
        value = randomValue(50, 300);
      } else {
        value = randomValue(20, 150);
      }

      const { error } = await supabaseAdmin
        .from('credit_card_transactions')
        .insert({
          user_id: targetUser.id,
          date: randomDate(6), // Últimos 6 meses para cartão
          description: randomItem(descriptions),
          card: cardId,
          category: categoriesMap[category],
          value: value,
          is_payment: false
        });

      if (!error) ccTransactionsCreated++;
    }

    // Adicionar alguns pagamentos de fatura
    for (let i = 0; i < 8; i++) {
      const bankId = randomItem(bankIds);
      const cardId = randomItem(cardIds);

      if (!bankId || !cardId) continue;

      // Pagamento de fatura (débito no banco)
      await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: targetUser.id,
          date: randomDate(6),
          description: 'Pagamento Fatura Cartao',
          bank: bankId,
          type: 'debit',
          category: categoriesMap['PAGAMENTO CARTAO'],
          value: randomValue(800, 2500)
        });

      // Pagamento de fatura (crédito no cartão)
      await supabaseAdmin
        .from('credit_card_transactions')
        .insert({
          user_id: targetUser.id,
          date: randomDate(6),
          description: 'Pagamento Fatura',
          card: cardId,
          category: categoriesMap['PAGAMENTO CARTAO'],
          value: -randomValue(800, 2500),
          is_payment: true
        });

      transactionsCreated++;
      ccTransactionsCreated++;
    }

    console.log(`[SEED-DEMO] ${transactionsCreated} transações bancárias criadas`);
    console.log(`[SEED-DEMO] ${ccTransactionsCreated} transações de cartão criadas`);

    return NextResponse.json({
      success: true,
      message: 'Dados de demonstração criados com sucesso!',
      summary: {
        banks: Object.keys(banksMap).length,
        categories: Object.keys(categoriesMap).length,
        creditCards: Object.keys(cardsMap).length,
        bankTransactions: transactionsCreated,
        creditCardTransactions: ccTransactionsCreated,
        totalRecords: Object.keys(banksMap).length + Object.keys(categoriesMap).length + Object.keys(cardsMap).length + transactionsCreated + ccTransactionsCreated
      }
    });

  } catch (error) {
    console.error('[SEED-DEMO] Erro geral:', error);
    return NextResponse.json({
      error: 'Erro interno: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}
