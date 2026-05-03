'use client';

import React, { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/lib/supabase';
import { AdminUser, ADMIN_EMAILS, toUpperCase } from '@/lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

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
  createdBy: string;
}

interface SeedModalData {
  email: string;
  startDate: string;
  endDate: string;
  transactionCount: number;
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
  const [seedModal, setSeedModal] = useState<SeedModalData | null>(null);
  const [dbStats, setDbStats] = useState<{ stats: { clientEmail: string; clientId: string; stats: Record<string, number>; total: number; sizeMB: number }[]; totalStats: Record<string, number>; totalSizeMB: number; tables: string[] } | null>(null);
  const [dbStatsLoading, setDbStatsLoading] = useState(false);
  const [dbStatsClientFilter, setDbStatsClientFilter] = useState('');
  const [showDbStats, setShowDbStats] = useState(false);
  const [clientOptions, setClientOptions] = useState<{ email: string; id: string }[]>([]);

  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6'];

  const isAdmin = user?.email && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase());

  const loadUsers = async () => {
    if (!user || !isAdmin) {
      console.log('[AdminPanel] loadUsers bloqueado - user:', !!user, 'isAdmin:', isAdmin);
      return;
    }
    setLoading(true);
    try {
      console.log('[AdminPanel] Carregando usuários via API...', 'adminEmail:', user.email);

      // Usar API com Service Role Key para ignorar RLS
      const response = await fetch(`/api/admin/list-users?adminEmail=${encodeURIComponent(user.email)}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar usuários');
      }

      const data = await response.json();
      console.log('[AdminPanel] Resposta da API:', data);
      console.log('[AdminPanel] Usuários encontrados:', data.users?.length || 0);

      // Lista de emails admin em lowercase para comparação
      const adminEmailsLower = ADMIN_EMAILS.map(e => e.toLowerCase());

      const usersList: AdminUser[] = (data.users || []).map((u: { id: string; email: string; created_at: string; expires_at: string | null; created_by: string | null }) => {
        const userEmail = (u.email || '').toLowerCase();
        const isUserAdmin = adminEmailsLower.includes(userEmail);

        return {
          uid: u.id,
          email: u.email || 'Sem email',
          createdAt: u.created_at || new Date().toISOString(),
          lastLogin: undefined,
          isAdmin: isUserAdmin,
          expiresAt: u.expires_at || null,
          createdBy: u.created_by || null
        };
      });

      console.log('[AdminPanel] Lista processada:', usersList);
      setUsers(usersList.sort((a, b) => a.email.localeCompare(b.email)));
      console.log('[AdminPanel] setUsers chamado com', usersList.length, 'usuários');

      const pendingList: PendingUser[] = (data.pendingUsers || []).map((p: { id: string; email: string; created_at: string; created_by: string | null }) => ({
        id: p.id,
        email: p.email,
        createdAt: p.created_at,
        createdBy: p.created_by || ''
      }));

      setPendingUsers(pendingList.sort((a, b) => a.email.localeCompare(b.email)));
    } catch (error) {
      console.error('[AdminPanel] Erro ao carregar:', error);
      showNotification('Erro ao carregar usuários', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    // Só carrega uma vez quando o usuário muda
    if (user && isAdmin) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Só depende do ID do usuário, não do objeto inteiro

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

      // Se requer sincronização, mostrar aviso e sincronizar automaticamente
      if (result.syncRequired) {
        showNotification(`⚠️ ${result.warning}`, 'error');
        // Oferecer sincronização automática
        if (confirm('Deseja sincronizar os usuários agora?')) {
          await handleSyncUsers();
        }
      } else if (result.requiresRegistration) {
        // Se requer registro do usuário, mostrar instrução
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
      expiresAt: u.expiresAt || '',
      createdBy: u.createdBy || ''
    });
    setEditExpiresAt(u.expiresAt || '');
  };

  // Sincronizar usuários do Auth com a tabela users
  const handleSyncUsers = async () => {
    if (!confirm('Deseja sincronizar os usuários do sistema de autenticação com a tabela de usuários?')) return;

    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/sync-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail: user?.email })
      });

      const result = await response.json();
      console.log('[SYNC] Resposta:', result);

      if (!response.ok) {
        showNotification(result.error || 'Erro ao sincronizar', 'error');
      } else {
        showNotification(`✅ Auth: ${result.authUsers}, Tabela: ${result.tableUsers}, Sincronizados: ${result.synced}`, 'success');
        // Recarregar lista de usuários (não a página toda)
        await loadUsers();
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      showNotification('Erro ao sincronizar', 'error');
    }
    
    setLoading(false);
  };

  // Debug - ver usuários
  const handleDebugUsers = async () => {
    try {
      const response = await fetch(`/api/admin/debug-users?adminEmail=${user?.email}`);
      const result = await response.json();

      console.log('=== DEBUG USUÁRIOS ===');
      console.log('Auth users:', result.auth);
      console.log('Table users:', result.table);
      console.log('Missing in table:', result.comparison?.missingInTable);

      alert(
        `📊 DEBUG:\n\n` +
        `Auth: ${result.auth?.count} usuários\n` +
        `Tabela: ${result.table?.count} usuários\n\n` +
        `Faltando na tabela: ${JSON.stringify(result.comparison?.missingInTable, null, 2)}`
      );
    } catch (error) {
      console.error('Erro no debug:', error);
      alert('Erro ao buscar debug. Veja o console (F12).');
    }
  };

  const loadDbStats = async () => {
    if (!user || !isAdmin) return;
    setDbStatsLoading(true);
    try {
      const params = new URLSearchParams({ adminEmail: user.email });
      if (dbStatsClientFilter) {
        params.set('clientEmail', dbStatsClientFilter);
      }
      const response = await fetch(`/api/admin/db-stats?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar estatísticas');
      }
      const data = await response.json();
      setDbStats(data);

      if (!dbStatsClientFilter && data.stats && data.stats.length > 0) {
        setClientOptions(data.stats.map((s: { clientEmail: string; clientId: string }) => ({ email: s.clientEmail, id: s.clientId })));
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      showNotification('Erro ao carregar estatísticas do banco de dados', 'error');
    }
    setDbStatsLoading(false);
  };

  // Abrir modal para popular dados de demonstração
  const openSeedModal = (targetEmail: string) => {
    // Calcular datas padrão (últimos 6 meses)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    const startDateStr = startDate.toISOString().split('T')[0];

    setSeedModal({
      email: targetEmail,
      startDate: startDateStr,
      endDate: endDate,
      transactionCount: 200
    });
  };

  // Executar popular dados de demonstração
  const handleSeedDemo = async () => {
    if (!seedModal) return;

    if (!seedModal.startDate || !seedModal.endDate) {
      showNotification('Selecione o período!', 'error');
      return;
    }

    if (seedModal.transactionCount < 10 || seedModal.transactionCount > 1000) {
      showNotification('Quantidade deve ser entre 10 e 1000!', 'error');
      return;
    }

    setLoading(true);
    setSeedModal(null);
    showNotification('⏳ Criando dados de demonstração...', 'success');

    try {
      const response = await fetch('/api/seed-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: user?.email,
          targetEmail: seedModal.email,
          startDate: seedModal.startDate,
          endDate: seedModal.endDate,
          transactionCount: seedModal.transactionCount
        })
      });

      const result = await response.json();

      if (!response.ok) {
        showNotification(result.error || 'Erro ao criar dados', 'error');
      } else {
        showNotification(
          `✅ Dados criados com sucesso!\n` +
          `Bancos: ${result.summary.banks}\n` +
          `Categorias: ${result.summary.categories}\n` +
          `Cartões: ${result.summary.creditCards}\n` +
          `Transações: ${result.summary.bankTransactions + result.summary.creditCardTransactions}`,
          'success'
        );
      }
    } catch (error) {
      console.error('Erro ao popular dados:', error);
      showNotification('Erro ao criar dados de demonstração', 'error');
    }

    setLoading(false);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>👑 Painel de Administração</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-sm btn-primary"
            onClick={loadUsers}
            disabled={loading}
            title="Recarregar lista de usuários"
          >
            {loading ? '⏳ Carregando...' : '🔄 Recarregar'}
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleDebugUsers}
            title="Ver usuários do Auth e tabela"
          >
            🔍 Debug
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleSyncUsers}
            disabled={loading}
            title="Sincroniza usuários do Auth com a tabela users"
          >
            🔄 Sincronizar
          </button>
        </div>
      </div>
      
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

      {/* Debug Info */}
      <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#f3f4f6', borderRadius: '0.25rem', fontSize: '0.85rem' }}>
        <strong>Debug:</strong> Total usuários: {users.length} | Filtrados: {filteredUsers.length} | Loading: {loading.toString()}
      </div>

      {/* Users List */}
      <h4 style={{ marginBottom: '1rem' }}>👥 Usuários Registrados ({users.length})</h4>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Criado por</th>
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
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  Carregando...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  Nenhum usuário encontrado
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => {
                const expired = isUserExpired(u.expiresAt);
                return (
                  <tr key={u.uid} style={{ opacity: expired ? 0.6 : 1 }}>
                    <td>{u.email}</td>
                    <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>{u.createdBy || 'N/A'}</td>
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
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#3b82f6', color: 'white', whiteSpace: 'nowrap' }}
                            onClick={() => openEditModal(u)}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#8b5cf6', color: 'white', whiteSpace: 'nowrap' }}
                            onClick={() => openSeedModal(u.email)}
                            disabled={loading}
                            title="Popular dados de demonstração"
                          >
                            📊 Demo
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

      {/* Database Stats Section */}
      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>📈 Estatísticas do Banco de Dados</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => setShowDbStats(!showDbStats)}
              disabled={dbStatsLoading}
            >
              {showDbStats ? '🔽 Ocultar' : '🔼 Mostrar'}
            </button>
            {showDbStats && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={loadDbStats}
                disabled={dbStatsLoading}
              >
                {dbStatsLoading ? '⏳ Carregando...' : '🔄 Atualizar'}
              </button>
            )}
          </div>
        </div>

        {showDbStats && (
          <>
            {/* Client Selector */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Selecionar cliente</label>
                <select
                  className="form-input"
                  value={dbStatsClientFilter}
                  onChange={e => {
                    setDbStatsClientFilter(e.target.value);
                    setDbStats(null);
                  }}
                >
                  <option value="">Todos os clientes</option>
                  {clientOptions.map(c => (
                    <option key={c.id} value={c.email}>{c.email}</option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-sm btn-primary"
                onClick={loadDbStats}
                disabled={dbStatsLoading}
              >
                {dbStatsLoading ? '⏳ Carregando...' : '🔍 Buscar'}
              </button>
            </div>

            {/* Stats Content */}
            {dbStatsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                Carregando estatísticas...
              </div>
            ) : dbStats ? (
              <>
                {/* Total Summary */}
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '0.5rem', border: '2px solid #3b82f6' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#0369a1' }}>
                    {dbStatsClientFilter ? '📊 Dados do Cliente' : '📊 Total Geral (Todos os Clientes)'}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                    {dbStats.tables.map((table: string) => (
                      <div key={table} style={{ padding: '0.75rem', background: 'white', borderRadius: '0.375rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                          {dbStats.totalStats[table] || 0}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'capitalize' }}>
                          {table.replace(/_/g, ' ')}
                        </div>
                      </div>
                    ))}
                    <div style={{ padding: '0.75rem', background: '#3b82f6', borderRadius: '0.375rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                        {dbStats.totalSizeMB} MB
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'white' }}>
                        Tamanho estimado
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pie Chart + Totals */}
                {!dbStatsClientFilter && dbStats.stats.length > 1 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#4b5563' }}>📊 Tamanho do BD por Cliente (MB)</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                      <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                        <ResponsiveContainer width="100%" height={350}>
                          <PieChart>
                            <Pie
                              data={dbStats.stats.map((s) => ({
                                name: s.clientEmail,
                                value: s.sizeMB
                              })).filter(d => d.value > 0)}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name.split('@')[0]} (${(percent * 100).toFixed(0)}%)`}
                              outerRadius={130}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {dbStats.stats.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${value} MB`} />
                            <Legend
                              formatter={(value: string) => value.length > 25 ? value.substring(0, 25) + '...' : value}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                        <h5 style={{ margin: '0 0 0.75rem 0', color: '#4b5563' }}>📋 Totalizador</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {dbStats.tables.map((table: string) => (
                            <div key={table} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'white', borderRadius: '0.375rem' }}>
                              <span style={{ fontSize: '0.85rem', color: '#6b7280', textTransform: 'capitalize' }}>
                                {table.replace(/_/g, ' ')}
                              </span>
                              <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>
                                {dbStats.totalStats[table] || 0}
                              </span>
                            </div>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#3b82f6', borderRadius: '0.375rem', marginTop: '0.5rem' }}>
                            <span style={{ fontWeight: 'bold', color: 'white' }}>
                              Total registros
                            </span>
                            <span style={{ fontWeight: 'bold', color: 'white' }}>
                              {dbStats.stats.reduce((acc, s) => acc + s.total, 0)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#8b5cf6', borderRadius: '0.375rem' }}>
                            <span style={{ fontWeight: 'bold', color: 'white' }}>
                              Tamanho total
                            </span>
                            <span style={{ fontWeight: 'bold', color: 'white' }}>
                              {dbStats.totalSizeMB} MB
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Per Client Stats */}
                {!dbStatsClientFilter && (
                  <>
                    <h4 style={{ marginBottom: '1rem', color: '#4b5563' }}>
                      📊 Dados por Cliente ({dbStats.stats.length})
                    </h4>
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Cliente</th>
                            {dbStats.tables.map((table: string) => (
                              <th key={table} style={{ textAlign: 'center', textTransform: 'capitalize', fontSize: '0.8rem' }}>
                                {table.replace(/_/g, ' ')}
                              </th>
                            ))}
                            <th style={{ textAlign: 'center' }}>Total</th>
                            <th style={{ textAlign: 'center' }}>Tamanho</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dbStats.stats.map((s) => (
                            <tr key={s.clientId}>
                              <td style={{ fontWeight: 500 }}>{s.clientEmail}</td>
                              {dbStats.tables.map((table: string) => (
                                <td key={table} style={{ textAlign: 'center' }}>
                                  <span className="badge" style={{ background: s.stats[table] > 0 ? '#22c55e' : '#e5e7eb', color: s.stats[table] > 0 ? 'white' : '#6b7280' }}>
                                    {s.stats[table] || 0}
                                  </span>
                                </td>
                              ))}
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                {s.total}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#3b82f6' }}>
                                {s.sizeMB} MB
                              </td>
                            </tr>
                          ))}
                          {/* Totalizer Row */}
                          <tr style={{ background: '#f0f9ff', borderTop: '3px solid #3b82f6' }}>
                            <td style={{ fontWeight: 'bold', color: '#3b82f6' }}>TOTAL GERAL</td>
                            {dbStats.tables.map((table: string) => {
                              const total = dbStats.stats.reduce((acc, s) => acc + (s.stats[table] || 0), 0);
                              return (
                                <td key={table} style={{ textAlign: 'center', fontWeight: 'bold', color: '#3b82f6' }}>
                                  {total}
                                </td>
                              );
                            })}
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#3b82f6' }}>
                              {dbStats.stats.reduce((acc, s) => acc + s.total, 0)}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#3b82f6' }}>
                              {dbStats.totalSizeMB} MB
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                Clique em &quot;Buscar&quot; para carregar as estatísticas
              </div>
            )}
          </>
        )}
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
            <p style={{ marginBottom: '0.5rem', color: '#6b7280' }}>
              <strong>Email:</strong> {editModal.email}
            </p>
            <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.85rem' }}>
              <strong>Criado por:</strong> {editModal.createdBy || 'N/A'}
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

      {/* Seed Demo Modal */}
      {seedModal && (
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
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h4 style={{ marginBottom: '1rem' }}>📊 Popular Dados de Demonstração</h4>
            <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
              <strong>Usuário:</strong> {seedModal.email}
            </p>

            <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e' }}>
                ⚠️ <strong>Atenção:</strong> Todos os dados existentes deste usuário serão apagados e substituídos pelos dados de demonstração.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Data Inicial *</label>
                <input
                  type="date"
                  className="form-input"
                  value={seedModal.startDate}
                  onChange={e => setSeedModal({ ...seedModal, startDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Data Final *</label>
                <input
                  type="date"
                  className="form-input"
                  value={seedModal.endDate}
                  onChange={e => setSeedModal({ ...seedModal, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Quantidade de Lançamentos *</label>
              <input
                type="number"
                className="form-input"
                min="10"
                max="1000"
                value={seedModal.transactionCount}
                onChange={e => setSeedModal({ ...seedModal, transactionCount: parseInt(e.target.value) || 200 })}
              />
              <small style={{ color: '#6b7280' }}>
                Mínimo: 10 | Máximo: 1000
              </small>
            </div>

            <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
              <h5 style={{ margin: '0 0 0.5rem 0', color: '#0369a1' }}>📦 O que será criado:</h5>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#0c4a6e' }}>
                <li><strong>8 Bancos</strong> com saldos iniciais</li>
                <li><strong>40 Categorias</strong> (receitas e despesas)</li>
                <li><strong>5 Cartões de Crédito</strong></li>
                <li><strong>{seedModal.transactionCount} transações</strong> distribuídas no período</li>
                <li>Lançamentos variados: salário, mercado, alimentação, transporte, lazer, etc.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                className="btn btn-primary"
                style={{ background: '#8b5cf6' }}
                onClick={handleSeedDemo}
                disabled={loading}
              >
                {loading ? '⏳ Criando...' : '✅ Criar Dados'}
              </button>
              <button
                className="btn"
                style={{ background: '#6b7280', color: 'white' }}
                onClick={() => setSeedModal(null)}
                disabled={loading}
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
