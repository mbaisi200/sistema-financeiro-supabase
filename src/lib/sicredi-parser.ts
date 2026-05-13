import { parseBrazilianDate, parseBrazilianValue, isPaymentKeyword } from './csv-import';

export interface SicrediTransaction {
  date: string;
  description: string;
  value: number;
  parcel?: string;
  isPayment: boolean;
}

const SICREDI_KEYWORDS = [
  'sicredi', 'associado', 'cooperativa', 'histórico de despesas',
  'cartão sicredi', 'visa empresarial', 'data de vencimento',
  'valor total (r$)', 'pagamento mínimo', 'resumo de despesas',
  'pagamentos / creditos', 'despesas / debitos'
];

const SICREDI_CSV_HEADER_PATTERNS = [
  /data\s*[;,\t]\s*descrição/i,
  /data\s*[;,\t]\s*descricao/i,
  /\bdata\b.*\bdescri[çc][aã]o\b.*\bvalor\b/i
];

export function detectSicrediFormat(content: string): boolean {
  const lower = content.toLowerCase();
  
  if (SICREDI_KEYWORDS.some(kw => lower.includes(kw))) {
    return true;
  }
  
  for (const pattern of SICREDI_CSV_HEADER_PATTERNS) {
    if (pattern.test(content)) {
      return true;
    }
  }
  
  return false;
}

function parseSicrediCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuotes) {
      if (char === quoteChar && nextChar === quoteChar) {
        current += quoteChar;
        i++;
      } else if (char === quoteChar) {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"' || char === "'") {
        inQuotes = true;
        quoteChar = char;
      } else if (char === ';' || char === ',' || char === '\t') {
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

function isDataHeaderLine(columns: string[]): boolean {
  if (columns.length < 3) return false;
  
  const lowerCols = columns.map(c => c.toLowerCase().trim());
  
  const hasDate = lowerCols.some(c => c === 'data' || c.includes('data'));
  const hasDesc = lowerCols.some(c => c === 'descrição' || c === 'descricao' || c.includes('descri') || c.includes('descric'));
  const hasValor = lowerCols.some(c => c === 'valor' || c.includes('valor'));
  
  return hasDate && hasDesc && hasValor;
}

function isTransactionLine(columns: string[]): boolean {
  if (columns.length < 3) return false;
  
  const firstCol = columns[0]?.trim() || '';
  
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(firstCol)) {
    return true;
  }
  
  return false;
}

export function parseSicrediText(content: string): SicrediTransaction[] {
  const transactions: SicrediTransaction[] = [];
  
  const lines = content.split(/\r?\n/);
  
  let headerFound = false;
  let dateColIdx = -1;
  let descColIdx = -1;
  let valorColIdx = -1;
  let parcelaColIdx = -1;
  
  console.log('🔍 Analisando', lines.length, 'linhas do Sicredi CSV...');
  
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx].trim();
    if (!line) continue;
    
    const columns = parseSicrediCsvLine(line);
    
    if (!headerFound) {
      if (isDataHeaderLine(columns)) {
        console.log('✅ Cabeçalho encontrado na linha', lineIdx + 1, ':', columns);
        
        const lowerCols = columns.map(c => c.toLowerCase().trim());
        
        for (let i = 0; i < lowerCols.length; i++) {
          const col = lowerCols[i];
          if (col === 'data' || col.includes('data')) dateColIdx = i;
          if (col === 'descrição' || col === 'descricao' || col.includes('descri') || col.includes('descric')) descColIdx = i;
          if (col === 'valor' && !col.includes('dólar') && !col.includes('dolar')) valorColIdx = i;
          if (col === 'parcela') parcelaColIdx = i;
        }
        
        if (valorColIdx === -1) {
          for (let i = 0; i < lowerCols.length; i++) {
            if (lowerCols[i].includes('valor')) {
              valorColIdx = i;
              break;
            }
          }
        }
        
        console.log('📋 Índices das colunas:', {
          data: dateColIdx,
          desc: descColIdx,
          valor: valorColIdx,
          parcela: parcelaColIdx
        });
        
        if (dateColIdx !== -1 && descColIdx !== -1 && valorColIdx !== -1) {
          headerFound = true;
        }
        continue;
      }
      
      if (isTransactionLine(columns)) {
        console.log('⚠️ Encontrada linha de transação antes do cabeçalho - usando ordem padrão');
        dateColIdx = 0;
        descColIdx = 1;
        parcelaColIdx = 2;
        valorColIdx = 3;
        headerFound = true;
      } else {
        continue;
      }
    }
    
    if (headerFound && isTransactionLine(columns)) {
      const dateStr = columns[dateColIdx]?.trim() || '';
      const descStr = columns[descColIdx]?.trim() || '';
      const valorStr = columns[valorColIdx]?.trim() || '';
      const parcelaStr = parcelaColIdx !== -1 ? columns[parcelaColIdx]?.trim() || '' : '';
      
      const date = parseBrazilianDate(dateStr);
      const value = parseBrazilianValue(valorStr);
      
      if (date && value !== null && descStr) {
        const description = descStr.toUpperCase();
        const isNegative = value < 0;
        const isInvoicePayment = description === 'PAGAMENTO' || description.includes('PAGAMENTO FATURA');
        
        if (isInvoicePayment) {
          console.log(`  ⏭️ Pagamento da fatura ignorado: ${date} | ${description} | ${value}`);
          continue;
        }
        
        const parcel = parcelaStr ? parcelaStr.replace(/[()]/g, '') : undefined;
        const isEstorno = isNegative;
        
        transactions.push({
          date,
          description,
          value: Math.abs(value),
          parcel: parcel || undefined,
          isPayment: isEstorno
        });
        
        if (isEstorno) {
          console.log(`  ✅ Estorno/Crédito: ${date} | ${description.substring(0, 30)} | ${Math.abs(value)}`);
        } else {
          console.log(`  ✅ Compra: ${date} | ${description.substring(0, 30)} | ${value}`);
        }
      } else {
        console.log(`  ❌ Linha inválida: data=${dateStr}, desc=${descStr}, valor=${valorStr}`);
      }
    }
  }
  
  console.log('💰 Total de transações extraídas:', transactions.length);
  
  return transactions;
}

export function formatSicrediAsCsv(transactions: SicrediTransaction[]): string {
  const header = 'Data,Descrição,Valor,Parcela';
  const rows = transactions.map(t => 
    `"${t.date}","${t.description}","${t.value}","${t.parcel || ''}"`
  );
  return [header, ...rows].join('\n');
}
