'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { parseCsv, mapAndValidateRows, suggestMapping, getCategorySuggestions, getCategorySuggestionsByKeywords, type CsvColumnMapping, type ParsedCsvRow, type CsvParseResult } from '@/lib/csv-import';
import { detectSicrediFormat, parseSicrediText, type SicrediTransaction } from '@/lib/sicredi-parser';
import { SearchableSelect } from './SearchableSelect';
import { toUpperCase, type CreditCardTransaction } from '@/lib/types';

 interface ImportCsvModalProps {
   isOpen: boolean;
   onClose: () => void;
   creditCards: { id: string; name: string; icon: string }[];
   categories: { id: string; name: string; icon: string }[];
   historicalTransactions: CreditCardTransaction[];
   descriptionMappings: Map<string, string>;
   onImport: (transactions: { date: string; description: string; card: string; category: string; value: number; isPayment: boolean }[]) => Promise<void>;
   showNotification: (msg: string, type: 'success' | 'error') => void;
 }

 type Step = 'upload' | 'mapping' | 'preview' | 'importing';

 export function ImportCsvModal({
   isOpen,
   onClose,
   creditCards,
   categories,
   historicalTransactions,
   descriptionMappings,
   onImport,
   showNotification
 }: ImportCsvModalProps) {
   const [step, setStep] = useState<Step>('upload');
   const [fileName, setFileName] = useState('');
   const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
   const [mapping, setMapping] = useState<CsvColumnMapping | null>(null);
   const [validRows, setValidRows] = useState<ParsedCsvRow[]>([]);
   const [errors, setErrors] = useState<string[]>([]);
   const [selectedCard, setSelectedCard] = useState('');
   const [defaultCategory, setDefaultCategory] = useState('');
   const [importing, setImporting] = useState(false);
   const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
   const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});
   const [isSicrediFormat, setIsSicrediFormat] = useState(false);
   const [sicrediRows, setSicrediRows] = useState<SicrediTransaction[]>([]);
   
    const now = new Date();
   const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
   const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
   const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
   const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
   const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
   
   type InvoiceMonthType = 'thisMonth' | 'lastMonth' | 'nextMonth' | 'custom';
   const [invoiceMonthType, setInvoiceMonthType] = useState<InvoiceMonthType>('thisMonth');
   const [customInvoiceMonth, setCustomInvoiceMonth] = useState<string>(thisMonthStr);
   
   const getInvoiceMonthValue = (): string => {
     switch (invoiceMonthType) {
       case 'thisMonth':
         return thisMonthStr;
       case 'lastMonth':
         return lastMonthStr;
       case 'nextMonth':
         return nextMonthStr;
       case 'custom':
         return customInvoiceMonth;
       default:
         return thisMonthStr;
     }
   };

  const fileInputRef = useRef<HTMLInputElement>(null);

   const resetState = useCallback(() => {
     setStep('upload');
     setFileName('');
     setParseResult(null);
     setMapping(null);
     setValidRows([]);
     setErrors([]);
     setSelectedCard('');
     setDefaultCategory('');
     setImporting(false);
     setImportProgress({ current: 0, total: 0 });
     setCategoryOverrides({});
     setIsSicrediFormat(false);
      setSicrediRows([]);
      setInvoiceMonthType('thisMonth');
      
      const now = new Date();
      const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setCustomInvoiceMonth(thisMonthStr);
    }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;

     console.log('📂 Arquivo selecionado:', file.name, 'Tamanho:', file.size, 'bytes');
     setFileName(file.name);
     setErrors([]);

     const reader = new FileReader();
     
     reader.onload = (event) => {
       const content = event.target?.result as string;
       
       console.log('📄 Conteúdo lido, tamanho:', content.length, 'caracteres');
       console.log('📄 Primeiros 500 chars:', content.substring(0, 500));
       
       try {
         const isSicredi = detectSicrediFormat(content);
         console.log('🔍 Formato Sicredi detectado:', isSicredi);
         
         if (isSicredi) {
           setIsSicrediFormat(true);
           const sicrediTransactions = parseSicrediText(content);
           
           console.log('💰 Transações Sicredi extraídas:', sicrediTransactions.length);
           
           if (sicrediTransactions.length === 0) {
             setErrors([
               'Formato Sicredi detectado mas nenhum lançamento foi extraído.',
               'Dica: Abra o CSV no Bloco de Notas e verifique o formato.',
               'Se for do PDF, tente exportar diretamente do internet banking como CSV.'
             ]);
             return;
           }
           
           setSicrediRows(sicrediTransactions);
           
           const mappedRows: ParsedCsvRow[] = sicrediTransactions.map(tx => ({
             date: tx.date,
             description: tx.description,
             value: tx.value,
             isPayment: tx.isPayment,
             original: {
               Data: tx.date,
               Descrição: tx.description,
               Valor: String(tx.value),
               Parcela: tx.parcel || ''
             }
           }));
           
           setValidRows(mappedRows);
           setStep('preview');
         } else {
           console.log('📊 Tentando parse como CSV padrão...');
           setIsSicrediFormat(false);
           
           const result = parseCsv(content);
           console.log('📊 Parse CSV - Headers:', result.headers, 'Linhas:', result.rows.length);
           
           setParseResult(result);
           
           if (result.errors.length > 0) {
             console.log('⚠️ Erros no parse CSV:', result.errors);
             setErrors(prev => [...prev, ...result.errors]);
           }
           
           if (result.headers.length === 0 || result.rows.length === 0) {
             setErrors([
               'Não foi possível identificar como CSV válido.',
               'Verifique se o arquivo não está vazio e tem pelo menos cabeçalho + 1 linha de dados.',
               'Dica: Abra no Bloco de Notas para ver o conteúdo real.'
             ]);
             return;
           }

           const suggested = suggestMapping(result.headers);
           console.log('🗺️ Mapeamento sugerido:', suggested);
           setMapping(suggested);

           setStep('mapping');
         }
       } catch (err: any) {
         console.error('❌ Erro no processamento:', err);
         setErrors([
           'Erro ao processar arquivo: ' + (err.message || 'Erro desconhecido'),
           'Abra o Console do Navegador (F12) para ver mais detalhes.'
         ]);
       }
     };
     
     reader.onerror = () => {
       console.error('❌ Erro ao ler arquivo');
       setErrors(['Erro ao ler arquivo.']);
     };
     
     reader.readAsText(file, 'UTF-8');
     
     setTimeout(() => {
       if (fileName && errors.length === 0 && step === 'upload') {
         console.log('🔄 Tentando com encoding ISO-8859-1...');
         const reader2 = new FileReader();
         reader2.onload = (e) => {
           const content2 = e.target?.result as string;
           if (content2 && content2 !== content) {
             console.log('📄 Diferente com ISO-8859-1 vs UTF-8');
           }
         };
         reader2.readAsText(file, 'ISO-8859-1');
       }
     }, 100);
   };

  const handleValidateMapping = () => {
    if (!parseResult || !mapping) return;

    const { validRows: valid, errors: validationErrors } = mapAndValidateRows(parseResult, mapping);
    
    setValidRows(valid);
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
    } else {
      setErrors([]);
    }

    if (valid.length > 0) {
      setStep('preview');
    }
  };

  const handleCategoryOverride = (description: string, categoryId: string) => {
    setCategoryOverrides(prev => ({
      ...prev,
      [description]: categoryId
    }));
  };

   const uniqueDescriptions = React.useMemo(() => {
     const descs = new Map<string, number>();
     validRows.forEach(row => {
       const count = descs.get(row.description) || 0;
       descs.set(row.description, count + 1);
     });
     return Array.from(descs.entries()).sort((a, b) => b[1] - a[1]);
   }, [validRows]);

    useEffect(() => {
     if (validRows.length === 0) return;
     if (Object.keys(categoryOverrides).length > 0) return;
     
     console.log('🔍 Buscando sugestões de categorias...');
     console.log('📊 Mapeamentos salvos na tabela:', descriptionMappings.size);
     console.log('📊 Transações no histórico:', historicalTransactions.length);
     
     const newOverrides: Record<string, string> = {};
     let fromTableCount = 0;
     let fromHistoryCount = 0;
     let fromKeywordsCount = 0;
     
     const historySuggestions = getCategorySuggestions(historicalTransactions);
     const uniqueDescList = uniqueDescriptions.map(([d]) => d);
     const keywordSuggestions = getCategorySuggestionsByKeywords(uniqueDescList, categories.map(c => ({ id: c.id, name: c.name })));
     
     console.log('🔍 Sugestões por palavras-chave encontradas:', keywordSuggestions.size);
     
     for (const [desc] of uniqueDescriptions) {
       const upperDesc = desc.toUpperCase();
       
       if (descriptionMappings.has(upperDesc)) {
         const catId = descriptionMappings.get(upperDesc)!;
         newOverrides[desc] = catId;
         fromTableCount++;
         const cat = categories.find(c => c.id === catId);
         console.log(`  🥇 "${desc}" -> ${cat?.icon || ''} ${cat?.name || catId} (tabela de mapeamentos)`);
         continue;
       }
       
       const historySuggestion = historySuggestions.get(desc);
       if (historySuggestion) {
         newOverrides[desc] = historySuggestion.categoryId;
         fromHistoryCount++;
         const cat = categories.find(c => c.id === historySuggestion.categoryId);
         console.log(`  🥈 "${desc}" -> ${cat?.icon || ''} ${cat?.name || historySuggestion.categoryId} (${historySuggestion.count}x no histórico)`);
         continue;
       }
       
       const keywordSuggestion = keywordSuggestions.get(desc);
       if (keywordSuggestion) {
         newOverrides[desc] = keywordSuggestion.categoryId;
         fromKeywordsCount++;
         const cat = categories.find(c => c.id === keywordSuggestion.categoryId);
         console.log(`  🥉 "${desc}" -> ${cat?.icon || ''} ${cat?.name || keywordSuggestion.categoryId} (palavra: "${keywordSuggestion.matchedWord}")`);
       }
     }
     
     const totalApplied = fromTableCount + fromHistoryCount + fromKeywordsCount;
     if (totalApplied > 0) {
       console.log(`🎯 ${totalApplied} de ${uniqueDescriptions.length} descrições receberam sugestão automática!`);
       console.log(`   - 🥇 ${fromTableCount} da tabela de mapeamentos`);
       console.log(`   - 🥈 ${fromHistoryCount} do histórico`);
       console.log(`   - 🥉 ${fromKeywordsCount} por palavras-chave`);
       setCategoryOverrides(newOverrides);
     } else {
       console.log('ℹ️ Nenhuma sugestão encontrada (primeira vez importando essas descrições).');
     }
   }, [validRows, historicalTransactions, categories, descriptionMappings]);

  const getCategoryForRow = (row: ParsedCsvRow): string => {
    if (categoryOverrides[row.description]) {
      return categoryOverrides[row.description];
    }
    return defaultCategory;
  };

   const getMissingCategories = (): string[] => {
     const missing: string[] = [];
     for (const [desc] of uniqueDescriptions) {
       if (!categoryOverrides[desc] && !defaultCategory) {
         missing.push(desc);
       }
     }
     return missing;
   };

   const handleImport = async () => {
     console.log('🔘 Botão Importar clicado!');
     console.log('📊 Estados:', {
       selectedCard,
       defaultCategory,
       validRowsCount: validRows.length,
       importing,
       categoryOverrides,
       uniqueDescriptions: uniqueDescriptions.length
     });
     
     if (!selectedCard) {
       console.log('❌ Sem cartão selecionado');
       showNotification('Selecione um cartão!', 'error');
       return;
     }
     
     const missing = getMissingCategories();
     if (missing.length > 0) {
       console.log('❌ Categorias faltando para:', missing);
       if (missing.length === uniqueDescriptions.length) {
         showNotification('Escolha uma categoria padrão OU categorize cada descrição!', 'error');
       } else {
         showNotification(`${missing.length} descrição(ões) sem categoria: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`, 'error');
       }
       return;
     }

     setImporting(true);
     setImportProgress({ current: 0, total: validRows.length });

      const effectiveInvoiceMonth = getInvoiceMonthValue();
      
      try {
        console.log(`📅 Mês da fatura selecionado: ${formatMonthYear(effectiveInvoiceMonth)}`);
        
        const transactions = validRows.map((row, idx) => {
          const cat = getCategoryForRow(row);
          console.log(`📝 Transação ${idx + 1}: categoria = ${cat}, fatura = ${effectiveInvoiceMonth}`);
          return {
            date: row.date,
            description: row.description,
            card: selectedCard,
            category: cat,
            value: row.value,
            isPayment: row.isPayment || row.value < 0,
            invoice_month: effectiveInvoiceMonth
          };
        });

       console.log('📤 Enviando', transactions.length, 'transações para onImport');
       await onImport(transactions);
       console.log('✅ onImport concluído com sucesso');

       showNotification(`${validRows.length} lançamentos importados com sucesso!`, 'success');
       handleClose();
     } catch (error: any) {
       console.error('❌ Erro NA importação:', error);
       showNotification('Erro ao importar: ' + (error.message || 'Erro desconhecido'), 'error');
     } finally {
       console.log('🔄 Finalizando importação, setImporting(false)');
       setImporting(false);
     }
   };

   const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
   const fmtDate = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '';
   
   const formatMonthYear = (yearMonth: string): string => {
     const [year, month] = yearMonth.split('-');
     const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
     return `${months[parseInt(month) - 1]}/${year}`;
   };

   if (!isOpen) return null;

  return (
    <div className="modal active" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%' }}>
        <div className="modal-header">
          <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>📥 Importar CSV do Cartão de Crédito</div>
          <button className="close-modal" onClick={handleClose}>×</button>
        </div>

        {/* Upload Step */}
        {step === 'upload' && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
            <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
              Selecione o arquivo CSV exportado pelo seu banco.<br />
              Suporta formatos de diferentes bancos (Itaú, Nubank, Bradesco, etc.)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button
              className="btn btn-primary btn-lg"
              onClick={() => fileInputRef.current?.click()}
            >
              Selecionar Arquivo CSV
            </button>
            {fileName && (
              <p style={{ marginTop: '1rem', color: '#10b981' }}>
                ✓ Arquivo selecionado: {fileName}
              </p>
            )}
          </div>
        )}

        {/* Mapping Step */}
        {step === 'mapping' && parseResult && mapping && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
                Arquivo: <strong>{fileName}</strong> | 
                Linhas: <strong>{parseResult.rows.length}</strong> | 
                Delimitador: <strong>{parseResult.delimiter === ';' ? 'Ponto-e-vírgula' : parseResult.delimiter === '\t' ? 'Tab' : 'Vírgula'}</strong>
              </p>
            </div>

            <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
              <h4 style={{ marginBottom: '1rem' }}>Mapear Colunas</h4>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                O sistema tentou detectar automaticamente. Ajuste se necessário.
              </p>
              
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Coluna de Data</label>
                  <select 
                    className="form-select" 
                    value={mapping.date} 
                    onChange={e => setMapping({ ...mapping, date: e.target.value })}
                  >
                    {parseResult.headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Coluna de Descrição</label>
                  <select 
                    className="form-select" 
                    value={mapping.description} 
                    onChange={e => setMapping({ ...mapping, description: e.target.value })}
                  >
                    {parseResult.headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Coluna de Valor</label>
                  <select 
                    className="form-select" 
                    value={mapping.value} 
                    onChange={e => setMapping({ ...mapping, value: e.target.value })}
                  >
                    {parseResult.headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Coluna de Categoria (opcional)</label>
                  <select 
                    className="form-select" 
                    value={mapping.category || ''} 
                    onChange={e => setMapping({ ...mapping, category: e.target.value || undefined })}
                  >
                    <option value="">Nenhuma / Usar padrão</option>
                    {parseResult.headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="card" style={{ marginBottom: '1rem', padding: '1rem', borderLeft: '4px solid #ef4444' }}>
                <h4 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Avisos:</h4>
                <ul style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {errors.slice(0, 10).map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                  {errors.length > 10 && <li>... e mais {errors.length - 10} erros</li>}
                </ul>
              </div>
            )}

            <div className="flex-end" style={{ gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep('upload')}>Voltar</button>
              <button className="btn btn-primary" onClick={handleValidateMapping}>Validar e Continuar →</button>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ color: '#6b7280' }}>
                <strong>{validRows.length}</strong> lançamentos válidos encontrados.
                {errors.length > 0 && <span style={{ color: '#ef4444' }}> ({errors.length} linhas com erros foram ignoradas)</span>}
              </p>
            </div>

             {/* Card/Category Selection */}
             <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
               <h4 style={{ marginBottom: '1rem' }}>⚙️ Configurar Importação</h4>
               <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                 <div className="form-group">
                   <label className="form-label" style={{ color: '#ef4444' }}>Cartão de Crédito *</label>
                   <select 
                     className="form-select" 
                     value={selectedCard} 
                     onChange={e => setSelectedCard(e.target.value)}
                     required
                     style={{ borderColor: selectedCard ? '#d1d5db' : '#ef4444' }}
                   >
                     <option value="">Selecione o cartão</option>
                     {creditCards.map(c => (
                       <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                     ))}
                   </select>
                 </div>
                    <div className="form-group">
                     <label className="form-label">Mês da Fatura <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>(quando você vai pagar)</span></label>
                     <select 
                       className="form-select" 
                       value={invoiceMonthType}
                       onChange={e => setInvoiceMonthType(e.target.value as InvoiceMonthType)}
                     >
                       <option value="nextMonth">📅 Próximo Mês ({formatMonthYear(nextMonthStr)})</option>
                       <option value="thisMonth">📅 Este Mês ({formatMonthYear(thisMonthStr)})</option>
                       <option value="lastMonth">📅 Mês Passado ({formatMonthYear(lastMonthStr)})</option>
                       <option value="custom">📅 Customizar...</option>
                     </select>
                  </div>
                    {invoiceMonthType === 'custom' && (
                      <div className="form-group">
                        <label className="form-label">Escolha o Mês/Ano</label>
                        <input
                          type="month"
                          className="form-input"
                          value={customInvoiceMonth}
                          onChange={e => setCustomInvoiceMonth(e.target.value)}
                        />
                      </div>
                    )}
                    {invoiceMonthType === 'custom' && (
                      <div style={{ marginTop: '0.25rem', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#2563eb', fontWeight: 600 }}>
                        📅 Importando para: {formatMonthYear(customInvoiceMonth)}
                      </div>
                    )}
                   <div className="form-group">
                     <label className="form-label">Categoria Padrão <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>(opcional)</span></label>
                     <SearchableSelect
                       options={categories.filter(c => c.id !== 'pagamento_cartao').map(c => ({ id: c.id, icon: c.icon, name: c.name }))}
                       value={defaultCategory}
                       onChange={setDefaultCategory}
                       placeholder="Ou categorize cada descrição abaixo..."
                     />
                  </div>
               </div>
            </div>

              {/* Category Overrides by Description */}
              {uniqueDescriptions.length > 0 && (
                <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
                  <h4 style={{ marginBottom: '0.75rem' }}>📂 Categorizar por Descrição</h4>
                  
                  {(() => {
                    const suggestions = getCategorySuggestions(historicalTransactions);
                    const suggestedCount = uniqueDescriptions.filter(([desc]) => suggestions.has(desc)).length;
                    
                    return (
                      <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                        <strong>{uniqueDescriptions.length} descrições únicas</strong> encontradas.
                        {suggestedCount > 0 && (
                          <span style={{ marginLeft: '0.5rem', color: '#2563eb', fontWeight: 600 }}>
                            💡 {suggestedCount} receberam sugestão automática do histórico!
                          </span>
                        )}
                        {!defaultCategory && suggestedCount < uniqueDescriptions.length && (
                          <span style={{ marginLeft: '0.5rem', color: '#ef4444', fontWeight: 600 }}>
                            ⚠️ Escolha categoria para as restantes!
                          </span>
                        )}
                      </p>
                    );
                  })()}
                  
                  {(() => {
                   const missing = [];
                   const hasCategory = [];
                   for (const [desc, count] of uniqueDescriptions) {
                     if (categoryOverrides[desc] || defaultCategory) {
                       hasCategory.push([desc, count]);
                     } else {
                       missing.push([desc, count]);
                     }
                   }
                   
                   if (missing.length > 0) {
                     return (
                       <div style={{ 
                         padding: '0.75rem', 
                         background: '#fef3c7', 
                         borderLeft: '4px solid #f59e0b', 
                         marginBottom: '0.75rem',
                         borderRadius: '0.25rem'
                       }}>
                         <strong style={{ color: '#92400e' }}>⚠️ {missing.length} descrição(ões) SEM CATEGORIA:</strong>
                         <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#78350f' }}>
                           {missing.slice(0, 5).map(([d]) => d).join(', ')}
                           {missing.length > 5 && `... e mais ${missing.length - 5}`}
                         </div>
                       </div>
                     );
                   }
                   
                   if (hasCategory.length === uniqueDescriptions.length) {
                     return (
                       <div style={{ 
                         padding: '0.75rem', 
                         background: '#dcfce7', 
                         borderLeft: '4px solid #22c55e', 
                         marginBottom: '0.75rem',
                         borderRadius: '0.25rem'
                       }}>
                         <strong style={{ color: '#166534' }}>✅ Todas as {uniqueDescriptions.length} descrições têm categoria!</strong>
                       </div>
                     );
                   }
                   
                   return null;
                 })()}
                 
                 <div style={{ 
                   maxHeight: uniqueDescriptions.length > 20 ? '300px' : 'auto', 
                   overflowY: 'auto', 
                   display: 'grid', 
                   gridTemplateColumns: uniqueDescriptions.length > 15 ? '1fr 1fr 1fr' : '1fr 1fr', 
                   gap: '0.5rem' 
                 }}>
                   {uniqueDescriptions.map(([desc, count]) => {
                     const hasOverride = !!categoryOverrides[desc];
                     const hasDefault = !!defaultCategory;
                     const isMissing = !hasOverride && !hasDefault;
                     
                     const selectedCat = categoryOverrides[desc] || defaultCategory;
                     const cat = categories.find(c => c.id === selectedCat);
                     
                     let bgColor = '#f9fafb';
                     let borderLeft = '';
                     
                     if (isMissing) {
                       bgColor = '#fef2f2';
                       borderLeft = '3px solid #ef4444';
                     } else if (hasOverride) {
                       bgColor = '#dbeafe';
                       borderLeft = '3px solid #3b82f6';
                     }
                     
                     return (
                       <div key={desc} className="form-group" style={{ 
                         marginBottom: 0, 
                         padding: '0.5rem', 
                         background: bgColor, 
                         borderRadius: '0.375rem',
                         borderLeft
                       }}>
                         <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                           {isMissing && <span style={{ color: '#ef4444' }}>⚠️ </span>}
                           {desc} <span style={{ color: '#9ca3af' }}>({count}x)</span>
                           {cat && <span style={{ marginLeft: '0.5rem' }}>{cat.icon} {cat.name}</span>}
                         </label>
                         <select
                           className="form-select"
                           style={{ fontSize: '0.8rem', borderColor: isMissing ? '#ef4444' : '#d1d5db' }}
                           value={categoryOverrides[desc] || ''}
                           onChange={e => handleCategoryOverride(desc, e.target.value)}
                         >
                           <option value="">📦 {defaultCategory ? `Usar Padrão (${categories.find(c => c.id === defaultCategory)?.name || ''})` : 'Escolha uma categoria...'}</option>
                           {categories.filter(c => c.id !== 'pagamento_cartao').map(c => (
                             <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                           ))}
                         </select>
                       </div>
                     );
                   })}
                 </div>
               </div>
             )}

             {/* Preview Table */}
             <div className="card" style={{ marginBottom: '1rem' }}>
               <h4 style={{ padding: '1rem 1rem 0', marginBottom: '0.5rem' }}>📋 Prévia dos Lançamentos</h4>
               <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                 <table className="table" style={{ fontSize: '0.85rem' }}>
                   <thead style={{ position: 'sticky', top: 0, background: '#f9fafb' }}>
                     <tr>
                       <th>Data</th>
                       <th>Descrição</th>
                       <th>Valor</th>
                       <th>Tipo</th>
                       <th>Categoria</th>
                     </tr>
                   </thead>
                   <tbody>
                     {validRows.slice(0, 50).map((row, i) => {
                       const isPayment = row.isPayment || row.value < 0;
                       const catId = getCategoryForRow(row);
                       const cat = categories.find(c => c.id === catId);
                       return (
                         <tr key={i}>
                           <td>{fmtDate(row.date)}</td>
                           <td>{row.description}</td>
                           <td className={isPayment ? 'value-credit' : 'value-debit'}>
                             {fmt(Math.abs(row.value))}
                           </td>
                           <td>
                             <span className={`badge ${isPayment ? 'category' : 'card'}`}>
                               {isPayment ? '📥 Estorno' : '💳 Compra'}
                             </span>
                           </td>
                           <td>
                             {cat ? (
                               <span className="badge category">{cat.icon} {cat.name}</span>
                             ) : (
                               <span style={{ color: '#f59e0b' }}>⚠️ Sem categoria</span>
                             )}
                           </td>
                         </tr>
                       );
                     })}
                     {validRows.length > 50 && (
                       <tr>
                         <td colSpan={5} style={{ textAlign: 'center', color: '#6b7280' }}>
                           ... e mais {validRows.length - 50} lançamentos
                         </td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </div>

            {/* Totals */}
            <div className="card" style={{ marginBottom: '1rem', padding: '1rem', background: '#f9fafb' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{validRows.length}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Lançamentos</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>
                    {fmt(validRows.filter(r => !r.isPayment && r.value > 0).reduce((s, r) => s + r.value, 0))}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Total Compras</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                    {fmt(Math.abs(validRows.filter(r => r.isPayment || r.value < 0).reduce((s, r) => s + Math.abs(r.value), 0)))}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Total Pagto/Estorno</div>
                </div>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="card" style={{ marginBottom: '1rem', padding: '1rem', borderLeft: '4px solid #f59e0b' }}>
                <h4 style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>Linhas ignoradas ({errors.length}):</h4>
                <ul style={{ fontSize: '0.8rem', color: '#6b7280', maxHeight: '100px', overflowY: 'auto' }}>
                  {errors.slice(0, 20).map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                  {errors.length > 20 && <li>... e mais {errors.length - 20}</li>}
                </ul>
              </div>
            )}

            {isSicrediFormat && (
              <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem', background: '#dbeafe', borderLeft: '4px solid #3b82f6' }}>
                <span style={{ fontWeight: 600 }}>🏦 Formato Sicredi detectado automaticamente!</span>
                <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#1e40af' }}>
                  ({sicrediRows.length} lançamentos extraídos do texto da fatura)
                </span>
              </div>
            )}

             <div className="flex-end" style={{ gap: '0.5rem' }}>
               {(() => {
                 const missing = getMissingCategories();
                 const canImport = selectedCard && missing.length === 0;
                 return (
                   <>
                     <div style={{ fontSize: '0.75rem', color: canImport ? '#10b981' : '#ef4444', marginRight: 'auto' }}>
                       📊 Status: Cartão={selectedCard ? '✅' : '❌'}, 
                       CategoriasFaltando={missing.length === 0 ? '✅(0)' : `❌(${missing.length})`}
                     </div>
                     <button className="btn btn-secondary" onClick={() => setStep(isSicrediFormat ? 'upload' : 'mapping')}>← Voltar</button>
                     <button 
                       className="btn btn-success" 
                       onClick={handleImport}
                       disabled={importing || !canImport}
                     >
                       {importing ? `Importando ${importProgress.current}/${importProgress.total}...` : `✅ Importar ${validRows.length} Lançamentos`}
                     </button>
                   </>
                 );
               })()}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
