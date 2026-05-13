export interface Bank { id: string; name: string; icon: string; initialBalance: number; }
export interface Category { id: string; name: string; icon: string; }
export interface CreditCard { id: string; name: string; bank: string; limit: number; icon: string; due_day?: number | null; }
export interface Transaction { id: string; date: string; description: string; bank: string; type: 'debit' | 'credit'; category: string; value: number; }
export interface CreditCardTransaction { id: string; date: string; description: string; card: string; category: string; value: number; isPayment?: boolean; invoice_month?: string | null; }

// Lançamentos Futuros
export interface ScheduledTransaction {
  id: string;
  description: string;
  type: 'parcel' | 'recurring' | 'single';
  transactionType: 'debit' | 'credit'; // débito (despesa) ou crédito (receita)
  value: number;
  totalInstallments: number;
  currentInstallment: number;
  dueDate: string;
  category: string;
  bank: string;
  card: string;
  isPaid: boolean;
  autoConfirm: boolean;
  status: 'pending' | 'confirmed' | 'cancelled';
}

// Função para converter texto para maiúsculo (exceto emails)
export const toUpperCase = (text: string): string => {
  if (!text) return text;
  // Verifica se é email (contém @)
  if (text.includes('@')) {
    return text.toLowerCase();
  }
  return text.toUpperCase();
};

// Função para verificar se é email
export const isEmail = (text: string): boolean => {
  return text.includes('@');
};

// Admin types
export interface AdminUser {
  uid: string;
  email: string;
  createdAt: string;
  lastLogin?: string;
  isAdmin?: boolean;
  expiresAt?: string | null;
  createdBy?: string | null;
}

export const ADMIN_EMAILS = ['baisinextel@gmail.com'];

export const DEFAULT_BANKS: Record<string, { icon: string; name: string; initialBalance: number }> = { 
  bb: { icon: '🏦', name: 'BANCO DO BRASIL', initialBalance: 0 }, 
  nubank: { icon: '💜', name: 'NUBANK', initialBalance: 0 } 
};

export const DEFAULT_CATEGORIES: Record<string, { icon: string; name: string }> = { 
  salario: { icon: '💰', name: 'SALÁRIO' }, 
  alimentacao: { icon: '🍕', name: 'ALIMENTAÇÃO' }, 
  pagamento_cartao: { icon: '💳', name: 'PAGAMENTO CARTÃO' } 
};

// Lista completa de emojis organizados por categoria
export const EMOJI_LIST = [
  // 💰 Finanças e Dinheiro
  '💰', '💵', '💴', '💶', '💷', '💸', '💳', '🧾', '📊', '📈', '📉', '🪙', '💎', '🏦', '💱', '💲',
  
  // 🏠 Casa e Moradia
  '🏠', '🏡', '🏢', '🏘️', '🏗️', '🔑', '🗝️', '🛋️', '🛏️', '🚿', '🛁', '🧹', '🧺', '💡', '🔌', '🧱', '🪟', '🚪',
  
  // 🍕 Alimentação
  '🍕', '🍔', '🌭', '🍟', '🍜', '🍝', '🍣', '🍱', '🥗', '🥘', '🍲', '🍛', '🌮', '🌯', '🥙', '🥪', '🧆', '🍳',
  '🥐', '🥯', '🍞', '🥨', '🧀', '🥚', '🥓', '🥞', '🧇', '🧈', '🍿', '🧂', '🥫', '🍱', '🥟', '🦪', '🍤', '🍙',
  '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍩', '🍪',
  '☕', '🍵', '🧃', '🥤', '🧋', '🥛', '🍼', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾',
  '🛒', '🛍️', '🧺', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝',
  
  // 🚗 Transporte
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🦼', '🛺', '🚲', '🛴', '🛵',
  '🏍️', '✈️', '🛫', '🛬', '🚁', '🚂', '🚄', '🚅', '🚈', '🚇', '🚝', '🚋', '🚠', '🚡', '🛶', '⛵', '🚤', '🛳️', '⛴️',
  '⛽', '🛞', '🧭', '🚏', '🛣️', '🛤️', '🚥', '🚦', '🅿️', '🛑', '🚧',
  
  // 🏥 Saúde
  '💊', '💉', '🩸', '🩹', '🩺', '🏥', '🚑', '👨‍⚕️', '👩‍⚕️', '🧬', '🔬', '🧪', '🧫', '🧬',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💗', '💓', '💞', '💘', '💝',
  '🏃', '🧘', '🏋️', '💪', '🦷', '🦴',
  
  // 📱 Tecnologia
  '📱', '📲', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '📷', '📸', '📹', '🎥', '📽️',
  '🎬', '📺', '📻', '🎙️', '🎤', '🎧', '📯', '🔔', '📢', '📣', '🔊', '🔉', '🔈', '🔇',
  '💡', '🔦', '🔋', '🔌', '📶', '📞', '☎️', '📟', '📠',
  
  // 🎮 Lazer e Entretenimento
  '🎮', '🕹️', '🎲', '🧩', '🧸', '🎯', '🎨', '🖼️', '🎬', '🎭', '🎪',
  '🎵', '🎶', '🎸', '🎹', '🎺', '🎷', '🥁', '🎻', '🎤', '🎧',
  '📺', '📽️', '🎬', '🎥', '🕹️', '👾', '🎯', '🎲', '🃏', '🀄', '🎴',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '🏑', '🏏', '🥅',
  '⛳', '🏹', '🎣', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂',
  
  // 📚 Educação
  '📚', '📖', '📕', '📗', '📘', '📙', '📓', '📔', '📒', '📃', '📜', '📄', '📰', '🗞️',
  '✏️', '✒️', '🖋️', '🖊️', '🖌️', '🖍️', '📝', '💼', '📁', '📂', '🗓️', '📇', '🗃️', '🗄️',
  '🔒', '🔓', '🔐', '🔑', '🗝️', '🎓', '🎒', '📐', '📏', '🔬', '🔭', '🧪', '🧫', '🧬',
  
  // 👔 Vestuário
  '👔', '👕', '👖', '🧥', '🥼', '🦺', '👚', '👗', '👘', '🥻', '🩱', '👙',
  '👒', '🎩', '🧢', '👑', '💍', '💎', '👟', '👞', '👠', '👡', '🥾', '🥿', '🩰',
  '🧣', '🧤', '🧦', '👛', '👜', '👝', '🛍️', '🎒',
  
  // 🐾 Pets
  '🐕', '🐶', '🐩', '🐈', '🐱', '🐈‍⬛', '🐦', '🐤', '🐥', '🐣', '🦆', '🦉', '🦜', '🐧', '🦢', '🦩',
  '🐠', '🐟', '🐡', '🦈', '🐙', '🐚', '🐌', '🦋', '🐛', '🐜', '🐝', '🐞',
  '🐢', '🐍', '🦎', '🦖', '🐊', '🐘', '🐁', '🐀', '🐿️', '🦔', '🐇', '🐰',
  
  // 🌱 Jardim e Natureza
  '🌱', '🌿', '☘️', '🍀', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🍁', '🍂', '🍃',
  '🌺', '🌸', '🌼', '🌷', '🌹', '🥀', '🌻', '💐', '🪷', '🪻',
  
  // 🎁 Presentes e Compras
  '🎁', '🎀', '🛍️', '🛒', '🧧', '📦', '📫', '📬', '📭', '📮', '✉️', '📧', '📨', '📩', '💌',
  '💭', '💬', '🗣️', '👤', '👥',
  
  // 🔧 Serviços
  '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🪛', '🪚', '🪓', '🧰', '🧲',
  '🧹', '🧺', '🧻', '🧼', '🧽', '🧴', '🛁', '🚿', '🚽', '🪥',
  
   // ✨ Outros
   '⭐', '🌟', '✨', '💫', '🔥', '💥', '🌈', '☀️', '🌤️', '⛅', '☁️', '🌧️', '⛈️',
   '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '🌪️', '🌫️', '🌊', '💧',
   '🔔', '🔕', '📣', '📢', '🔊', '🔉', '🔈', '🔇', '♾️', '♻️', '⚠️', '⛔', '🚫',
   '✅', '❌', '❓', '❔', '❕', '❗', '💯', '🔘', '🔗', '🏷️', '🏁', '🚩', '🎌'
 ];

export function getInvoiceMonth(
  transactionDate: string,
  dueDay: number | null | undefined,
  defaultDueDay: number = 10
): string {
  const date = new Date(transactionDate + 'T00:00:00');
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  const effectiveDueDay = dueDay ?? defaultDueDay;
  
  if (day > effectiveDueDay) {
    const nextMonth = month + 1;
    if (nextMonth > 11) {
      return `${year + 1}-01`;
    }
    return `${year}-${String(nextMonth + 1).padStart(2, '0')}`;
  }
  
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function getInvoiceMonthRange(
  yearMonth: string,
  dueDay: number | null | undefined,
  defaultDueDay: number = 10
): { start: string; end: string } {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  
  const effectiveDueDay = dueDay ?? defaultDueDay;
  
  const invoiceStart = new Date(year, month - 1, effectiveDueDay + 1);
  const invoiceEnd = new Date(year, month, effectiveDueDay);
  
  const formatDate = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  
  return {
    start: formatDate(invoiceStart),
    end: formatDate(invoiceEnd)
  };
}

export function isInInvoiceMonth(
  transactionDate: string,
  invoiceYearMonth: string,
  dueDay: number | null | undefined
): boolean {
  const txInvoiceMonth = getInvoiceMonth(transactionDate, dueDay);
  return txInvoiceMonth === invoiceYearMonth;
}
