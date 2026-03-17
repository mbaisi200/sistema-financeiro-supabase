export interface Bank { id: string; name: string; icon: string; initialBalance: number; }
export interface Category { id: string; name: string; icon: string; }
export interface CreditCard { id: string; name: string; bank: string; limit: number; icon: string; }
export interface Transaction { id: string; date: string; description: string; bank: string; type: 'debit' | 'credit'; category: string; value: number; }
export interface CreditCardTransaction { id: string; date: string; description: string; card: string; category: string; value: number; isPayment?: boolean; }

// Lançamentos Futuros
export interface ScheduledTransaction {
  id: string;
  description: string;
  type: 'parcel' | 'recurring' | 'single';
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
