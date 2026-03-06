'use client';

import React, { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/lib/supabase';
import { AdminUser, ADMIN_EMAILS, toUpperCase } from '@/lib/types';

interface PendingUser {
  id: string;
  email: string;
  createdAt: string;
  createdBy: string;
}

interface EditModalData {
  uid: string;
  email: string;
  expiresAt: string;
}

export function AdminPanel({ showNotification }: { showNotification: (msg: string, type: 'success' | 'error') => void }) {
  const { user } = useFinance();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserExpiresAt, setNewUserExpiresAt] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [editModal, setEditModal] = useState<EditModalData | null>(null);
  const [editExpiresAt, setEditExpiresAt] = useState('');

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  const loadUsers = async () => {
    if (!user || !isAdmin) return;
    setLoading(true);
    try {
      // Load registered users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('email');

      if (usersError) throw usersError;

      // Lista de emails admin em lowercase para comparação
      const adminEmailsLower = ADMIN_EMAILS.map(e => e.toLowerCase());

      const usersList: AdminUser[] = (usersData || []).map((u: { id: string; email: string; created_at: string; expires_at: string | null }) => {
        const userEmail = (u.email || '').toLowerCase();
        const isUserAdmin = adminEmailsLower.includes(userEmail);

        // Debug
        console.log(`[AdminPanel] Usuário: ${u.email}, IsAdmin: ${isUserAdmin}, AdminEmails:`, adminEmailsLower);

        return {
          uid: u.id,
          email: u.email || 'Sem email',
          createdAt: u.created_at || new Date().toISOString(),
          lastLogin: undefined,
          isAdmin: isUserAdmin,
          expiresAt: u.expires_at || null
        };
      });

      setUsers(usersList.sort((a, b) => a.email.localeCompare(b.email)));

      // Load pending users
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_users')
        .select('*')
        .order('email');

      if (pendingError) throw pendingError;

      const pendingList: PendingUser[] = (pendingData || []).map((p: { id: string; email: string; created_at: string; created_by: string | null }) => ({
        id: p.id,
        email: p.email,
        createdAt: p.created_at,
        createdBy: p.created_by || ''
      }));

      setPendingUsers(pendingList.sort((a, b) => a.email.localeCompare(b.email)));
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      showNotification('Erro ao carregar usuários', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, [user]);

  // Verificar se usuário está expirado
  const isUserExpired = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return false;
    const expDate = new Date(expiresAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);
    return today > expDate;
  };

  // Formatar data para exibição
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Sem limite';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const handleCreateUser = async () => {
    if (!newUserEmail) {
      showNotification('Digite o email do usuário!', 'error');
      return;
    }

    if (!newUserPassword || newUserPassword.length < 6) {
      showNotification('A senha deve ter pelo menos 6 caracteres!', 'error');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail)) {
      showNotification('Digite um email válido!', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          adminEmail: user?.email,
          expiresAt: newUserExpiresAt || null,
          operation: 'create'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        // Se tem instruções de configuração, mostrar alerta especial
        if (result.instructions) {
          showNotification('⚠️ Configure a Service Role Key no servidor. Veja instruções no console.', 'error');
          console.error('=== CONFIGURAÇÃO NECESSÁRIA ===');
          console.error(result.error);
          console.error('Passo 1:', result.instructions.step1);
          console.error('Passo 2:', result.instructions.step2);
          console.error('Passo 3:', result.instructions.step3);
          console.error('Passo 4:', result.instructions.step4);
          alert(`${result.error}\n\n${result.instructions.step1}\n${result.instructions.step2}\n${result.instructions.step3}\n${result.instructions.step4}`);
        } else {
          showNotification(result.error || 'Erro ao criar usuário', 'error');
        }
        setLoading(false);
        return;
      }

      // Se requer registro do usuário, mostrar instrução
      if (result.requiresRegistration) {
        showNotification(`✉️ Convite criado! O usuário deve se registrar com email: ${newUserEmail} e a senha fornecida.`, 'success');
      } else {
        showNotification(`Usuário ${newUserEmail} criado com sucesso!`, 'success');
      }
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserExpiresAt('');
      loadUsers();
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      showNotification('Erro ao criar usuário', 'error');
    }
    setLoading(false);
  };

  const handleEditUser = async () => {
    if (!editModal) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editModal.email,
          adminEmail: user?.email,
          expiresAt: editExpiresAt || null,
          operation: 'update',
          uid: editModal.uid
        })
      });

      const result = await response.json();

      if (!response.ok) {
        showNotification(result.error || 'Erro ao atualizar usuário', 'error');
        setLoading(false);
        return;
      }

      showNotification('Usuário atualizado com sucesso!', 'success');
      setEditModal(null);
      loadUsers();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      showNotification('Erro ao atualizar usuário', 'error');
    }
    setLoading(false);
  };

  const handleDeletePending = async (id: string, email: string) => {
    if (!confirm(`Remover convite de ${email}?`)) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('pending_users').delete().eq('id', id);
      if (error) throw error;
      showNotification('Convite removido!', 'success');
      loadUsers();
    } catch (error) {
      console.error('Erro ao remover convite:', error);
      showNotification('Erro ao remover convite', 'error');
    }
    setLoading(false);
  };

  const handleDeleteUser = async (uid: string, email: string) => {
    // Verificação case-insensitive
    const isAdminUser = ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase());
    if (isAdminUser) {
      showNotification('Não é possível excluir um administrador!', 'error');
      return;
    }

    // Confirmação dupla para segurança
    const confirm1 = confirm(`⚠️ ATENÇÃO!\n\nTem certeza que deseja excluir o usuário ${email}?\n\nEsta ação irá excluir TODOS os dados deste usuário:\n- Transações\n- Cartões de crédito\n- Categorias\n- Bancos\n- Acesso ao sistema\n\nEsta ação NÃO pode ser desfeita!`);
    if (!confirm1) return;

    const confirm2 = confirm(`🔴 ÚLTIMA CONFIRMAÇÃO!\n\nDigite "EXCLUIR" para confirmar a exclusão de ${email}.\n\nPressione OK para confirmar.`);
    if (!confirm2) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          email,
          adminEmail: user?.email
        })
      });

      const result = await response.json();

      if (!response.ok) {
        showNotification(result.error || 'Erro ao excluir usuário', 'error');
        setLoading(false);
        return;
      }

      showNotification(`✅ Usuário ${email} excluído com sucesso!`, 'success');
      loadUsers();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      showNotification('Erro ao excluir usuário', 'error');
    }
    setLoading(false);
  };

  const openEditModal = (u: AdminUser) => {
    setEditModal({
      uid: u.uid,
      email: u.email,
      expiresAt: u.expiresAt || ''
    });
    setEditExpiresAt(u.expiresAt || '');
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

  const filteredPending = pendingUsers.filter(u => 
    u.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⛔</div>
          <h3>Acesso Restrito</h3>
          <p>Você não tem permissão para acessar o painel de administração.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1rem' }}>👑 Painel de Administração</h3>
      
      {/* Create User */}
      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f0f9ff', borderRadius: '0.5rem', border: '2px solid #3b82f6' }}>
        <h4 style={{ marginBottom: '1rem', color: '#3b82f6' }}>👤 Criar Novo Usuário</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">E-mail *</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="usuario@email.com" 
              value={newUserEmail} 
              onChange={e => setNewUserEmail(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Senha *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Mínimo 6 caracteres" 
              value={newUserPassword} 
              onChange={e => setNewUserPassword(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Validade (opcional)</label>
            <input 
              type="date" 
              className="form-input" 
              value={newUserExpiresAt} 
              onChange={e => setNewUserExpiresAt(e.target.value)} 
            />
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          style={{ marginTop: '1rem' }} 
          onClick={handleCreateUser}
          disabled={loading}
        >
          {loading ? 'Criando...' : '✅ Criar Usuário'}
        </button>
      </div>

      {/* Pending Invites */}
      {pendingUsers.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ marginBottom: '1rem', color: '#f59e0b' }}>⏳ Convites Pendentes ({pendingUsers.length})</h4>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPending.map(u => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => handleDeletePending(u.id, u.email)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '1rem' }}>
        <input 
          type="text" 
          className="form-input" 
          placeholder="🔍 Buscar por email..." 
          value={searchEmail} 
          onChange={e => setSearchEmail(e.target.value)} 
        />
      </div>

      {/* Users List */}
      <h4 style={{ marginBottom: '1rem' }}>👥 Usuários Registrados</h4>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Validade</th>
              <th>Status</th>
              <th>Criado em</th>
              <th>Tipo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  Carregando...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  Nenhum usuário encontrado
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => {
                const expired = isUserExpired(u.expiresAt);
                return (
                  <tr key={u.uid} style={{ opacity: expired ? 0.6 : 1 }}>
                    <td>{u.email}</td>
                    <td>{formatDate(u.expiresAt)}</td>
                    <td>
                      {u.isAdmin ? (
                        <span className="badge" style={{ background: '#8b5cf6' }}>♾️ Ilimitado</span>
                      ) : expired ? (
                        <span className="badge" style={{ background: '#ef4444' }}>⛔ Expirado</span>
                      ) : u.expiresAt ? (
                        <span className="badge" style={{ background: '#22c55e' }}>✅ Ativo</span>
                      ) : (
                        <span className="badge" style={{ background: '#3b82f6' }}>♾️ Sem limite</span>
                      )}
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <span className={`badge ${u.isAdmin ? 'credit' : 'debit'}`}>
                        {u.isAdmin ? '👑 Admin' : '👤 Usuário'}
                      </span>
                    </td>
                    <td>
                      {!u.isAdmin ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'nowrap' }}>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#3b82f6', color: 'white', whiteSpace: 'nowrap' }}
                            onClick={() => openEditModal(u)}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            style={{ whiteSpace: 'nowrap' }}
                            onClick={() => handleDeleteUser(u.uid, u.email)}
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Protegido</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
        <p style={{ fontSize: '0.9rem', color: '#4b5563' }}>
          📊 Total: <strong>{users.length}</strong>
          {' | '}
          👑 Admins: <strong>{users.filter(u => u.isAdmin).length}</strong>
          {' | '}
          ✅ Ativos: <strong>{users.filter(u => !u.isAdmin && !isUserExpired(u.expiresAt)).length}</strong>
          {' | '}
          ⛔ Expirados: <strong>{users.filter(u => !u.isAdmin && isUserExpired(u.expiresAt)).length}</strong>
        </p>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            maxWidth: '400px',
            width: '100%'
          }}>
            <h4 style={{ marginBottom: '1rem' }}>✏️ Editar Usuário</h4>
            <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
              <strong>Email:</strong> {editModal.email}
            </p>
            <div className="form-group">
              <label className="form-label">Nova Data de Validade</label>
              <input 
                type="date" 
                className="form-input" 
                value={editExpiresAt} 
                onChange={e => setEditExpiresAt(e.target.value)} 
              />
              <small style={{ color: '#6b7280' }}>
                Deixe em branco para acesso ilimitado
              </small>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleEditUser}
                disabled={loading}
              >
                {loading ? 'Salvando...' : '💾 Salvar'}
              </button>
              <button 
                className="btn" 
                style={{ background: '#6b7280', color: 'white' }}
                onClick={() => setEditModal(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
