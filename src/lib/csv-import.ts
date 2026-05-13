export interface CsvColumnMapping {
  date: string;
  description: string;
  value: string;
  category?: string;
}

export interface ParsedCsvRow {
  date: string;
  description: string;
  value: number;
  category?: string;
  isPayment: boolean;
  original: Record<string, string>;
}

export interface CsvParseResult {
  headers: string[];
  rows: ParsedCsvRow[];
  errors: string[];
  delimiter: string;
}

function detectDelimiter(content: string): string {
  const lines = content.trim().split('\n').slice(0, 5);
  if (lines.length === 0) return ',';

  const commaCount = lines[0].split(',').length;
  const semicolonCount = lines[0].split(';').length;
  const tabCount = lines[0].split('\t').length;

  if (semicolonCount > commaCount && semicolonCount >= 2) return ';';
  if (tabCount > commaCount && tabCount >= 2) return '\t';
  return ',';
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export function parseBrazilianDate(dateStr: string): string | null {
  const cleaned = dateStr.trim();
  
  const brPattern = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
  const brMatch = cleaned.match(brPattern);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10);
    let year = parseInt(brMatch[3], 10);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const isoPattern = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
  const isoMatch = cleaned.match(isoPattern);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const usPattern = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
  const usMatch = cleaned.match(usPattern);
  if (usMatch) {
    const month = parseInt(usMatch[1], 10);
    const day = parseInt(usMatch[2], 10);
    let year = parseInt(usMatch[3], 10);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

export function parseBrazilianValue(valueStr: string): number | null {
  const cleaned = valueStr.trim().replace(/[R$\s]/g, '');
  
  if (cleaned === '') return null;

  const isNegative = cleaned.startsWith('-') || cleaned.startsWith('(') || cleaned.endsWith('-');
  const numStr = cleaned.replace(/[\-\(\)]/g, '');

  if (numStr.includes(',') && numStr.includes('.')) {
    const lastComma = numStr.lastIndexOf(',');
    const lastDot = numStr.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      const parsed = parseFloat(
        numStr.replace(/\./g, '').replace(',', '.')
      );
      return isNaN(parsed) ? null : (isNegative ? -parsed : parsed);
    } else {
      const parsed = parseFloat(
        numStr.replace(/\,/g, '')
      );
      return isNaN(parsed) ? null : (isNegative ? -parsed : parsed);
    }
  }

  if (numStr.includes(',')) {
    const parsed = parseFloat(numStr.replace(',', '.'));
    return isNaN(parsed) ? null : (isNegative ? -parsed : parsed);
  }

  const parsed = parseFloat(numStr);
  return isNaN(parsed) ? null : (isNegative ? -parsed : parsed);
}

 export function isPaymentKeyword(description: string): boolean {
  const keywords = [
    'pagamento', 'pagto', 'pgto', 'estorno', 'credito', 'crédito',
    'devolucao', 'devolução', 'reembolso', 'ajuste', 'bonus', 'bônus',
    'cashback', 'desconto', 'est.', 'pag', 'pagt'
  ];
  const lower = description.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

interface KeywordMapping {
  keywords: string[];
  categoryType: string;
}

const KEYWORD_TO_CATEGORY_TYPE: KeywordMapping[] = [
  {
    categoryType: 'supermercado',
    keywords: ['mercado', 'supermercado', 'atacadao', 'pao de acucar', 'carrefour', 'walmart', 'extra', 'assai', 'sams club', 'cooperativa', 'supermercad']
  },
  {
    categoryType: 'restaurante',
    keywords: ['restaurante', 'lanchonete', 'pizzaria', 'hamburguer', 'ifood', 'rappi', 'food', 'feijao', 'churrascaria', 'padaria', 'sushi', 'japones', 'picanha', 'rodizio', 'hes restaurantes']
  },
  {
    categoryType: 'transporte',
    keywords: ['posto', 'gasolina', 'combustivel', 'uber', '99 pop', 'taxi', 'onibus', 'metro', 'estacionamento', 'park', 'oficina', 'mecanica', 'mecanico', 'pneu', 'oleo', 'autopecas', 'auto pecas', 'sabesp', 'elektro', 'energia', 'telefone', 'internet', 'tim', 'claro', 'vivo', 'oi']
  },
  {
    categoryType: 'saude',
    keywords: ['drogasil', 'farmacia', 'drogaria', 'panvel', 'hospital', 'clinica', 'medico', 'dentista', 'remedio', 'plano de saude', 'raia drogasil']
  },
  {
    categoryType: 'educacao',
    keywords: ['escola', 'faculdade', 'universidade', 'curso', 'livraria', 'livro', 'material escolar', 'colegio']
  },
  {
    categoryType: 'lazer',
    keywords: ['cinema', 'filme', 'teatro', 'show', 'concerto', 'jogo', 'game', 'streaming', 'netflix', 'spotify', 'disney', 'prime', 'hbo', 'ifd', 'spa', 'beleza', 'academia', 'gym', 'fitness', 'rotaryclubde']
  },
  {
    categoryType: 'roupa',
    keywords: ['roupa', 'lojas', 'magazine luiza', 'magalu', 'americanas', 'casas bahia', 'ponto frio', 'shopee', 'mercado livre', 'mercadolivre', 'mercado pago', 'shein', 'enjoei', 'kanui', 'tiktok', 'tik tok', 'shop', 'tiktok shop', 'ebn tiktok']
  },
  {
    categoryType: 'bebida',
    keywords: ['adega', 'cerveja', 'vinho', 'bebida', 'bebidas', 'tabacaria', 'cigarro', 'cho pao']
  },
  {
    categoryType: 'casa',
    keywords: ['casa', 'moveis', 'eletrodomestico', 'lar', 'decoracao', 'limpeza', 'jardinagem', 'casa de carnes', 'covabra']
  },
  {
    categoryType: 'servicos',
    keywords: ['servico', 'seguranca', 'seguro', 'imposto', 'taxa', 'anuidade', 'tarifa', 'banco', 'seguradora', 'advogado', 'contador', 'manutencao', 'segprint', 'mvtech', 'txentregvisto', 'bmb sabesp', 'drax centro automot', 'pneu free com']
  },
  {
    categoryType: 'presente',
    keywords: ['presente', 'aniversario', 'natal', 'presentes', 'chocolate', 'flor', 'festa', 'pesqbistecao', 'bisteca']
  },
  {
    categoryType: 'outros',
    keywords: []
  }
];

function findCategoryByType(
  categories: { id: string; name: string }[],
  categoryType: string
): { id: string; name: string } | null {
  const normalizedType = normalizeText(categoryType);
  
  for (const cat of categories) {
    const normalizedName = normalizeText(cat.name);
    if (normalizedName === normalizedType) {
      return cat;
    }
  }
  
  for (const cat of categories) {
    const normalizedName = normalizeText(cat.name);
    if (normalizedName.includes(normalizedType) || normalizedType.includes(normalizedName)) {
      return cat;
    }
  }
  
  return null;
}

export function suggestCategoryByKeywords(
  description: string,
  categories: { id: string; name: string }[]
): { categoryId: string | null; score: number; matchedWord?: string } {
  const normalizedDesc = normalizeText(description);
  
  let bestMatch: { categoryId: string | null; score: number; matchedWord?: string } = { categoryId: null, score: 0 };

  for (const cat of categories) {
    const normalizedCatName = normalizeText(cat.name);
    if (normalizedDesc.includes(normalizedCatName)) {
      const score = normalizedCatName.length;
      if (score > bestMatch.score) {
        bestMatch = { categoryId: cat.id, score: score, matchedWord: cat.name };
      }
    }
  }

  for (const mapping of KEYWORD_TO_CATEGORY_TYPE) {
    for (const kw of mapping.keywords) {
      const normalizedKw = normalizeText(kw);
      if (normalizedDesc.includes(normalizedKw)) {
        const matchedCat = findCategoryByType(categories, mapping.categoryType);
        if (matchedCat) {
          if (kw.length > bestMatch.score) {
            bestMatch = { categoryId: matchedCat.id, score: kw.length, matchedWord: kw };
          }
        }
      }
    }
  }

  return bestMatch;
}

export function getCategorySuggestionsByKeywords(
  descriptions: string[],
  categories: { id: string; name: string }[]
): Map<string, { categoryId: string; score: number; matchedWord?: string }> {
  const result = new Map<string, { categoryId: string; score: number; matchedWord?: string }>();

  for (const desc of descriptions) {
    const suggestion = suggestCategoryByKeywords(desc, categories);
    if (suggestion.categoryId) {
      result.set(desc, { categoryId: suggestion.categoryId, score: suggestion.score, matchedWord: suggestion.matchedWord });
    }
  }

  return result;
}

export function parseCsv(content: string): CsvParseResult {
  const errors: string[] = [];
  const delimiter = detectDelimiter(content);

  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    return { headers: [], rows: [], errors: ['Arquivo CSV vazio ou com apenas cabeçalho'], delimiter };
  }

  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine, delimiter);

  if (headers.length < 3) {
    errors.push(`Apenas ${headers.length} colunas encontradas. Esperado pelo menos 3 (data, descrição, valor).`);
  }

  const rows: ParsedCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCsvLine(line, delimiter);
    const row: Record<string, string> = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    rows.push({
      date: '',
      description: '',
      value: 0,
      category: undefined,
      isPayment: false,
      original: row
    });
  }

  return { headers, rows, errors, delimiter };
}

export function mapAndValidateRows(
  parseResult: CsvParseResult,
  mapping: CsvColumnMapping
): { validRows: ParsedCsvRow[]; errors: string[] } {
  const errors: string[] = [];
  const validRows: ParsedCsvRow[] = [];

  const { headers, rows } = parseResult;

  if (!headers.includes(mapping.date)) {
    errors.push(`Coluna de data "${mapping.date}" não encontrada. Disponíveis: ${headers.join(', ')}`);
  }
  if (!headers.includes(mapping.description)) {
    errors.push(`Coluna de descrição "${mapping.description}" não encontrada.`);
  }
  if (!headers.includes(mapping.value)) {
    errors.push(`Coluna de valor "${mapping.value}" não encontrada.`);
  }

  if (errors.length > 0) {
    return { validRows: [], errors };
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const original = row.original;

    const dateStr = original[mapping.date];
    const descStr = original[mapping.description];
    const valueStr = original[mapping.value];
    const categoryStr = mapping.category ? original[mapping.category] : undefined;

    const date = parseBrazilianDate(dateStr);
    if (!date) {
      errors.push(`Linha ${i + 2}: Data inválida: "${dateStr}"`);
      continue;
    }

    const value = parseBrazilianValue(valueStr);
    if (value === null) {
      errors.push(`Linha ${i + 2}: Valor inválido: "${valueStr}"`);
      continue;
    }

    const description = descStr.toUpperCase();
    const isPayment = value < 0 || isPaymentKeyword(description);

    validRows.push({
      date,
      description,
      value: Math.abs(value) * (isPayment && value > 0 ? -1 : (value < 0 ? value : value)),
      category: categoryStr?.toUpperCase(),
      isPayment,
      original
    });
  }

  return { validRows, errors };
}

export interface CategorySuggestion {
  description: string;
  categoryId: string;
  count: number;
}

export function getCategorySuggestions(
  transactions: { description: string; category: string }[]
): Map<string, { categoryId: string; count: number }> {
  const mapping = new Map<string, { categoryId: string; count: number }>();
  const stats = new Map<string, Map<string, number>>();

  for (const tx of transactions) {
    const desc = tx.description.toUpperCase().trim();
    const cat = tx.category;
    
    if (!desc || !cat) continue;
    
    if (!stats.has(desc)) {
      stats.set(desc, new Map());
    }
    
    const catStats = stats.get(desc)!;
    const currentCount = catStats.get(cat) || 0;
    catStats.set(cat, currentCount + 1);
  }

  for (const [desc, catStats] of stats.entries()) {
    let maxCount = 0;
    let bestCategory = '';
    
    for (const [cat, count] of catStats.entries()) {
      if (count > maxCount) {
        maxCount = count;
        bestCategory = cat;
      }
    }
    
    if (bestCategory && maxCount >= 1) {
      mapping.set(desc, { categoryId: bestCategory, count: maxCount });
    }
  }

  return mapping;
}

export function suggestMapping(headers: string[]): CsvColumnMapping {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());

  let dateCol = '';
  let descCol = '';
  let valueCol = '';
  let categoryCol: string | undefined = undefined;

  const datePatterns = ['data', 'date', 'dt_', 'dt.', 'lançamento', 'lancamento', 'movimento'];
  const descPatterns = ['descricao', 'descrição', 'description', 'historico', 'histórico', 'estabelecimento', 'estab.', 'nome', 'titulo', 'título'];
  const valuePatterns = ['valor', 'value', 'amount', 'importe', 'preço', 'preco', 'total'];
  const categoryPatterns = ['categoria', 'category', 'tipo', 'classificacao', 'classificação'];

  for (let i = 0; i < lowerHeaders.length; i++) {
    const h = lowerHeaders[i];
    if (!dateCol && datePatterns.some(p => h.includes(p))) dateCol = headers[i];
    if (!descCol && descPatterns.some(p => h.includes(p))) descCol = headers[i];
    if (!valueCol && valuePatterns.some(p => h.includes(p))) valueCol = headers[i];
    if (!categoryCol && categoryPatterns.some(p => h.includes(p))) categoryCol = headers[i];
  }

  if (!dateCol) dateCol = headers[0] || '';
  if (!descCol) descCol = headers[1] || dateCol;
  if (!valueCol) valueCol = headers[2] || headers[headers.length - 1] || '';

  return {
    date: dateCol,
    description: descCol,
    value: valueCol,
    category: categoryCol
  };
}
