'use client';

import React, { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { EMOJI_LIST, toUpperCase } from '@/lib/types';

export function Categories({ showNotification }: { showNotification: (msg: string, type: 'success' | 'error') => void }) {
  const { categories, addCategory, updateCategory, deleteCategory } = useFinance();
  const [form, setForm] = useState({ name: '', icon: '📦' });
  const [editId, setEditId] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);

  const isDefault = (id: string) => ['salario', 'alimentacao', 'pagamento_cartao'].includes(id);

  const handleSave = async () => {
    if (!form.name) {
      showNotification('Preencha o nome!', 'error');
      return;
    }
    const data = { name: toUpperCase(form.name), icon: form.icon };
    if (editId) {
      await updateCategory(editId, data);
      showNotification('Categoria atualizada!', 'success');
      setEditId(null);
    } else {
      await addCategory(data);
      showNotification('Categoria adicionada!', 'success');
    }
    setForm({ name: '', icon: '📦' });
  };

  const startEdit = (c: any) => {
    setEditId(c.id);
    setForm({ name: c.name, icon: c.icon });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Excluir categoria?')) {
      await deleteCategory(id);
      showNotification('Excluída!', 'success');
    }
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1rem' }}>Categorias</h3>
      
      {/* Form */}
      <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #e5e7eb' }}>
        <h4 style={{ marginBottom: '1rem' }}>{editId ? 'Editar' : 'Adicionar'} Categoria</h4>
        <div className="form-grid" style={{ marginBottom: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Nome da Categoria</label>
            <input 
              type="text" 
              className="form-input uppercase" 
              placeholder="Ex: ALIMENTAÇÃO" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})} 
              onBlur={e => setForm({...form, name: toUpperCase(e.target.value)})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Ícone Selecionado</label>
            <input type="text" className="form-input" style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }} value={form.icon} readOnly />
          </div>
          <button className="btn btn-success" style={{ marginTop: '1.5rem' }} onClick={handleSave}>
            {editId ? 'Atualizar' : 'Adicionar'}
          </button>
          {editId && (
            <button className="btn btn-secondary" style={{ marginTop: '1.5rem' }} onClick={() => { setEditId(null); setForm({ name: '', icon: '📦' }); }}>
              Cancelar
            </button>
          )}
        </div>
        <div>
          <label style={{ fontSize: '0.85rem', color: '#4b5563', display: 'block', marginBottom: '0.5rem' }}>Clique em um emoji para escolher:</label>
          <div className="emoji-picker">
            {EMOJI_LIST.map(e => (
              <div key={e} className="emoji-option" onClick={() => setForm({...form, icon: e})}>{e}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="categories-grid">
        {categories.map(c => (
          <div key={c.id} className="category-card">
            <div className="category-icon">{c.icon}</div>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{c.name}</div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button className="btn btn-sm btn-secondary" onClick={() => startEdit(c)}>Editar</button>
              {!isDefault(c.id) && (
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>Excluir</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          Nenhuma categoria cadastrada
        </div>
      )}
    </div>
  );
}
