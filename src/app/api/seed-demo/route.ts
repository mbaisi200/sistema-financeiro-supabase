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
  'Rendimento Tesouro',
  'Juros Aplicacao',
];

const EXPENSE_DESCRIPTIONS: Record<string, string[]> = {
  'ALIMENTACAO': [
    'Restaurante Sabor Caseiro',
    'Lanche Shopping',
    'Pizza Hut',
    'McDonalds',
    'Habibs',
    'Bobs',
    'Spoleto',
    'Giraffas',
    'Subway',
    'China in Box',
    'Restaurante Japones',
    'Churrascaria',
    'Padaria Central',
    'Cafe da Manha',
    'Almoco Trabalho',
    'Lanche Tarde',
    'iFood',
    'Rappi',
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
    'Acougue',
    'Supermercado',
    'Compras Semanais',
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
    'Pneus',
    'Alinhamento',
  ],
  'UBER/99': [
    'Uber Casa-Trabalho',
    '99 Pop',
    'Uber Shopping',
    'Uber Noite',
    'Cabify',
    'Uber Aeroporto',
  ],
  'MORADIA': [
    'Aluguel Apartamento',
    'Condominio',
    'IPTU',
    'Manutencao Predio',
    'Reforma',
  ],
  'ENERGIA': [
    'Conta Luz',
    'Energia Eletrica',
    'Cemig',
    'Light',
    'Enel',
    'Conta Energia',
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
    'Netflix',
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
    'Paramount+',
  ],
  'SPOTIFY': [
    'Spotify Premium',
    'Apple Music',
    'Deezer',
    'YouTube Music',
  ],
  'ACADEMIA': [
    'Mensalidade Academia',
    'Smart Fit',
    'Body Tech',
    'Fitness',
    'Personal Trainer',
  ],
  'SAUDE': [
    'Plano de Saude',
    'Unimed',
    'Amil',
    'Bradesco Saude',
    'Consulta Medica',
    'Exames Laboratoriais',
    'Dentista',
    'Oftalmologista',
  ],
  'FARMACIA': [
    'Drogasil',
    'Pague Menos',
    'Panvel',
    'Raia',
    'Sao Joao',
    'Medicamentos',
    'Vitaminas',
  ],
  'EDUCACAO': [
    'Mensalidade Faculdade',
    'Material Escolar',
    'Livros Didaticos',
    'Escola Filhos',
    'Uniforme',
  ],
  'CURSOS': [
    'Udemy',
    'Alura',
    'Coursera',
    'Curso Ingles',
    'Pos Graduacao',
    'MBA',
    'Certificacao',
  ],
  'LAZER': [
    'Cinema',
    'Teatro',
    'Show',
    'Parque',
    'Bowling',
    'Kart',
    'Bar',
    'Balada',
  ],
  'ROUPAS': [
    'Renner',
    'C&A',
    'Riachuelo',
    'Marisa',
    'Zara',
    'H&M',
    'Calcadatos',
    'Loja Roupas',
  ],
  'PRESENTES': [
    'Presente Aniversario',
    'Presente Dia Namorados',
    'Presente Mae',
    'Presente Pai',
    'Presente Natal',
    'Presente Criancas',
  ],
  'PET SHOP': [
    'Racao Pet',
    'Petshop',
    'Veterinario',
    'Banho Pet',
    'Tosa',
    'Brinquedos Pet',
  ],
  'VIAGEM': [
    'Passagem Aerea',
    'Hotel',
    'Pousada',
    'Resort',
    'Aluguel Carro',
    'Passeio Turistico',
    'Pacote Viagem',
  ],
  'COSMETICOS': [
    'Boticario',
    'Quem Disse Berenice',
    'Mac',
    'Sephora',
    'Perfumaria',
    'Maquiagem',
  ],
  'CABELEREIRO': [
    'Corte Cabelo',
    'Barbearia',
    'Salao Beleza',
    'Manicure',
    'Pedicure',
    'Coloracao',
  ],
  'GASOLINA': [
    'Posto Shell',
    'Posto Ipiranga',
    'Posto Petrobras',
    'Combustivel',
    'Etanol',
    'Gasolina Aditivada',
  ],
  'MANUTENCAO CARRO': [
    'Oficina',
    'Troca Oleo',
    'Revisao',
    'Freios',
    'Suspensao',
    'Ar Condicionado',
  ],
  'CINEMA': [
    'Cinemark',
    'Kinoplex',
    'Ingresso Cinema',
    'Pipoca',
    'Combo Cinema',
  ],
  'LIVROS': [
    'Livraria Cultura',
    'Saraiva',
    'Livros Amazon',
    'Kindle',
    'Livro Fisico',
  ],
  'IMPOSTOS': [
    'IRPF',
    'IPTU',
    'IPVA',
    'Taxas Municipais',
    'Contribuicao',
  ],
  'SEGURO': [
    'Seguro Auto',
    'Seguro Vida',
    'Seguro Residencia',
    'Seguro Saude',
  ],
  'EMPRESTIMO': [
    'Parcela Emprestimo',
    'Financiamento',
    'Consorcio',
    'Credito Pessoal',
  ],
};

// Função para gerar data aleatória dentro de um período
function randomDateInRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
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

    const { adminEmail, targetEmail, startDate, endDate, transactionCount } = await request.json();

    // Verificar se é admin (case-insensitive)
    const adminEmailsLower = ADMIN_EMAILS.map(e => e.toLowerCase());
    if (!adminEmailsLower.includes((adminEmail || '').toLowerCase())) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    // Validar parâmetros
    const count = Math.min(Math.max(transactionCount || 200, 10), 1000);
    const start = startDate || new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    console.log(`[SEED-DEMO] Período: ${start} a ${end}, Quantidade: ${count}`);

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

    // 4. Criar Transações
    console.log(`[SEED-DEMO] Criando ${count} transações...`);
    let bankTransactions = 0;
    let ccTransactions = 0;

    const bankIds = Object.values(banksMap);
    const cardIds = Object.values(cardsMap);
    const expenseCategories = Object.keys(EXPENSE_DESCRIPTIONS);
    const incomeCategories = ['SALARIO', 'FREELA', 'INVESTIMENTOS'];
    const mainBanks = ['BANCO DO BRASIL', 'NUBANK', 'ITAU'];

    // Calcular quantas transações de cada tipo
    // Aproximadamente 15% de receitas, 55% despesas banco, 30% cartão
    const incomeCount = Math.floor(count * 0.15);
    const bankExpenseCount = Math.floor(count * 0.55);
    const cardExpenseCount = count - incomeCount - bankExpenseCount;

    // Criar transações de receita (salários, freelas, etc.)
    for (let i = 0; i < incomeCount; i++) {
      const category = randomItem(incomeCategories);
      const bankName = randomItem(mainBanks);
      const bankId = banksMap[bankName];

      if (!bankId || !categoriesMap[category]) continue;

      let value: number;
      if (category === 'SALARIO') {
        value = randomValue(5500, 9500);
      } else if (category === 'FREELA') {
        value = randomValue(500, 3500);
      } else {
        value = randomValue(50, 800);
      }

      const { error } = await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: targetUser.id,
          date: randomDateInRange(start, end),
          description: randomItem(INCOME_DESCRIPTIONS),
          bank: bankId,
          type: 'credit',
          category: categoriesMap[category],
          value: value
        });

      if (!error) bankTransactions++;
    }

    // Criar transações de despesa em banco
    for (let i = 0; i < bankExpenseCount; i++) {
      const category = randomItem(expenseCategories);
      const bankId = randomItem(bankIds);

      if (!bankId || !categoriesMap[category]) continue;

      const descriptions = EXPENSE_DESCRIPTIONS[category] || [category];
      let value: number;

      // Definir ranges de valor por categoria
      if (['ALUGUEL', 'MORADIA'].includes(category)) {
        value = randomValue(1200, 2800);
      } else if (['SAUDE'].includes(category)) {
        value = randomValue(250, 900);
      } else if (['ENERGIA', 'AGUA'].includes(category)) {
        value = randomValue(80, 350);
      } else if (['INTERNET', 'TELEFONE'].includes(category)) {
        value = randomValue(80, 220);
      } else if (['STREAMING', 'SPOTIFY', 'NETFLIX'].includes(category)) {
        value = randomValue(25, 70);
      } else if (['ACADEMIA'].includes(category)) {
        value = randomValue(80, 180);
      } else if (['MERCADO'].includes(category)) {
        value = randomValue(150, 700);
      } else if (['ALIMENTACAO', 'RESTAURANTE'].includes(category)) {
        value = randomValue(35, 180);
      } else if (['TRANSPORTE', 'GASOLINA'].includes(category)) {
        value = randomValue(60, 350);
      } else if (['UBER/99'].includes(category)) {
        value = randomValue(18, 90);
      } else if (['EDUCACAO', 'CURSOS'].includes(category)) {
        value = randomValue(80, 600);
      } else if (['LAZER', 'CINEMA'].includes(category)) {
        value = randomValue(40, 180);
      } else if (['ROUPAS'].includes(category)) {
        value = randomValue(80, 550);
      } else if (['VIAGEM', 'HOTEL'].includes(category)) {
        value = randomValue(250, 2500);
      } else if (['PET SHOP'].includes(category)) {
        value = randomValue(50, 250);
      } else if (['IMPOSTOS'].includes(category)) {
        value = randomValue(100, 500);
      } else if (['SEGURO'].includes(category)) {
        value = randomValue(150, 400);
      } else if (['EMPRESTIMO'].includes(category)) {
        value = randomValue(300, 800);
      } else {
        value = randomValue(25, 220);
      }

      const { error } = await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: targetUser.id,
          date: randomDateInRange(start, end),
          description: randomItem(descriptions),
          bank: bankId,
          type: 'debit',
          category: categoriesMap[category],
          value: value
        });

      if (!error) bankTransactions++;
    }

    // Criar transações de cartão de crédito
    for (let i = 0; i < cardExpenseCount; i++) {
      const category = randomItem(expenseCategories);
      const cardId = randomItem(cardIds);

      if (!cardId || !categoriesMap[category]) continue;

      const descriptions = EXPENSE_DESCRIPTIONS[category] || [category];
      let value: number;

      // Cartão geralmente tem gastos menores
      if (['ALIMENTACAO', 'RESTAURANTE'].includes(category)) {
        value = randomValue(30, 150);
      } else if (['MERCADO'].includes(category)) {
        value = randomValue(60, 350);
      } else if (['STREAMING', 'SPOTIFY', 'NETFLIX'].includes(category)) {
        value = randomValue(30, 60);
      } else if (['ROUPAS'].includes(category)) {
        value = randomValue(100, 500);
      } else if (['LAZER', 'CINEMA'].includes(category)) {
        value = randomValue(50, 150);
      } else if (['COSMETICOS', 'CABELEREIRO'].includes(category)) {
        value = randomValue(60, 300);
      } else if (['UBER/99'].includes(category)) {
        value = randomValue(20, 70);
      } else if (['PRESENTES'].includes(category)) {
        value = randomValue(60, 350);
      } else if (['VIAGEM'].includes(category)) {
        value = randomValue(200, 800);
      } else {
        value = randomValue(30, 180);
      }

      const { error } = await supabaseAdmin
        .from('credit_card_transactions')
        .insert({
          user_id: targetUser.id,
          date: randomDateInRange(start, end),
          description: randomItem(descriptions),
          card: cardId,
          category: categoriesMap[category],
          value: value,
          is_payment: false
        });

      if (!error) ccTransactions++;
    }

    // Adicionar alguns pagamentos de fatura
    const paymentCount = Math.floor(count / 25);
    for (let i = 0; i < paymentCount; i++) {
      const bankId = randomItem(bankIds);
      const cardId = randomItem(cardIds);

      if (!bankId || !cardId) continue;

      const paymentValue = randomValue(500, 2000);

      // Pagamento de fatura (débito no banco)
      await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: targetUser.id,
          date: randomDateInRange(start, end),
          description: 'Pagamento Fatura Cartao',
          bank: bankId,
          type: 'debit',
          category: categoriesMap['PAGAMENTO CARTAO'],
          value: paymentValue
        });

      // Pagamento de fatura (crédito no cartão)
      await supabaseAdmin
        .from('credit_card_transactions')
        .insert({
          user_id: targetUser.id,
          date: randomDateInRange(start, end),
          description: 'Pagamento Fatura',
          card: cardId,
          category: categoriesMap['PAGAMENTO CARTAO'],
          value: -paymentValue,
          is_payment: true
        });

      bankTransactions++;
      ccTransactions++;
    }

    console.log(`[SEED-DEMO] ${bankTransactions} transações bancárias criadas`);
    console.log(`[SEED-DEMO] ${ccTransactions} transações de cartão criadas`);

    return NextResponse.json({
      success: true,
      message: 'Dados de demonstração criados com sucesso!',
      summary: {
        banks: Object.keys(banksMap).length,
        categories: Object.keys(categoriesMap).length,
        creditCards: Object.keys(cardsMap).length,
        bankTransactions: bankTransactions,
        creditCardTransactions: ccTransactions,
        totalRecords: Object.keys(banksMap).length + Object.keys(categoriesMap).length + Object.keys(cardsMap).length + bankTransactions + ccTransactions,
        period: { start, end }
      }
    });

  } catch (error) {
    console.error('[SEED-DEMO] Erro geral:', error);
    return NextResponse.json({
      error: 'Erro interno: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}
