'use client';

import React, { useState, useRef } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { AuthScreen } from '@/components/finance/AuthScreen';
import { Dashboard } from '@/components/finance/Dashboard';
import { Transactions } from '@/components/finance/Transactions';
import { ScheduledTransactions } from '@/components/finance/ScheduledTransactions';
import { CreditCards } from '@/components/finance/CreditCards';
import { Banks } from '@/components/finance/Banks';
import { Categories } from '@/components/finance/Categories';
import { AdminPanel } from '@/components/finance/AdminPanel';
import { NotificationArea, Notification } from '@/components/finance/Notification';
import { ChangePasswordModal } from '@/components/finance/Modals';
import { ADMIN_EMAILS } from '@/lib/types';

function AppContent() {
  const { user, loading, logout, isOnline, banks, getBankBalance, changePassword, isExpired, expiresAt, transactions, categories, creditCards, creditCardTransactions, exportToJSON } = useFinance();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  if (loading) {
    return (
      <div className="loader-overlay">
        <div className="spinner"></div>
        <p style={{ marginTop: '1.5rem', color: '#4b5563', fontWeight: 600 }}>Carregando dados...</p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  // Tela de expiração
  if (isExpired) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
        padding: '1rem'
      }}>
        <div style={{ 
          background: 'white', 
          borderRadius: '1rem', 
          padding: '3rem', 
          maxWidth: '500px', 
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⛔</div>
          <h1 style={{ fontSize: '1.5rem', color: '#dc2626', marginBottom: '1rem' }}>
            Acesso Expirado
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
            Sua mensalidade venceu em:
          </p>
          <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#dc2626', marginBottom: '1.5rem' }}>
            {expiresAt ? new Date(expiresAt).toLocaleDateString('pt-BR') : 'Data não definida'}
          </p>
          <p style={{ color: '#4b5563', marginBottom: '2rem' }}>
            Entre em contato com o administrador para renovar seu acesso e continuar utilizando o sistema.
          </p>
          <div style={{ 
            background: '#fef3c7', 
            padding: '1rem', 
            borderRadius: '0.5rem', 
            marginBottom: '1.5rem',
            border: '1px solid #fcd34d'
          }}>
            <p style={{ color: '#92400e', fontSize: '0.9rem' }}>
              📧 Contato: <strong>baisinextel@gmail.com</strong>
            </p>
          </div>
          <button 
            className="btn btn-danger" 
            onClick={logout}
            style={{ width: '100%' }}
          >
            🚪 Sair
          </button>
        </div>
      </div>
    );
  }

  const totalBalance = banks.reduce((s, b) => s + getBankBalance(b.id), 0);
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  const handleExportCSV = () => {
    setShowExportMenu(false);
    showNotification('CSV exportado!', 'success');
  };

  const handleExportJSON = () => {
    setShowExportMenu(false);
    showNotification('JSON exportado!', 'success');
  };

  // Backup - Exportar todos os dados
  const handleBackup = async () => {
    if (!user) return;
    setBackupLoading(true);
    try {
      const response = await fetch(`/api/backup?user_id=${user.id}`);
      const backup = await response.json();

      if (!response.ok) {
        throw new Error(backup.error || 'Erro ao criar backup');
      }

      // Criar arquivo para download
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-financeiro-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification(`✅ Backup criado! ${backup.stats.transactions} transações, ${backup.stats.banks} bancos, ${backup.stats.categories} categorias.`, 'success');
      setShowBackupModal(false);
    } catch (error) {
      console.error('Erro no backup:', error);
      showNotification('Erro ao criar backup', 'error');
    }
    setBackupLoading(false);
  };

  // Restore - Importar backup
  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setBackupLoading(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      // Validar formato do backup
      if (!backup.data) {
        throw new Error('Formato de backup inválido');
      }

      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          data: backup.data,
          mode: restoreMode
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao restaurar backup');
      }

      showNotification(`✅ Backup restaurado! ${result.results.transactions.inserted} transações importadas.`, 'success');
      setShowBackupModal(false);
      // Recarregar página para atualizar dados
      window.location.reload();
    } catch (error) {
      console.error('Erro no restore:', error);
      showNotification('Erro ao restaurar backup: ' + (error instanceof Error ? error.message : 'Erro desconhecido'), 'error');
    }
    setBackupLoading(false);
    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'lancamentos', label: 'Lançamentos', icon: '📝' },
    { id: 'futuros', label: 'Futuros', icon: '📅' },
    { id: 'cartoes', label: 'Cartões', icon: '💳' },
    { id: 'bancos', label: 'Bancos', icon: '🏦' },
    { id: 'categorias', label: 'Categorias', icon: '🏷️' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: '👑' }] : []),
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ 
        background: 'white', 
        padding: '1rem', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1rem', 
        position: 'sticky', 
        top: 0, 
        zIndex: 50 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            💰 Planilha Financeira
            {isAdmin && <span style={{ fontSize: '0.7rem', background: '#fbbf24', color: '#78350f', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>ADMIN</span>}
          </span>
          <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
            <div className="status-dot"></div>
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Email do usuário */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.4rem 0.75rem', 
            background: '#f3f4f6', 
            borderRadius: '0.5rem',
            fontSize: '0.85rem',
            color: '#4b5563'
          }}>
            <span>👤</span>
            <span style={{ fontWeight: 500 }}>{user?.email}</span>
          </div>
          
          {/* Botão Alterar Senha - antes do Exportar */}
          <button className="btn btn-sm btn-secondary" onClick={() => setShowPasswordModal(true)} title="Alterar senha">
            🔒 Senha
          </button>

          {/* Botão Backup */}
          <button className="btn btn-sm btn-secondary" onClick={() => setShowBackupModal(true)} title="Backup e Restore">
            💾 Backup
          </button>
          
          <div className="export-menu-container">
            <button className="btn btn-sm btn-secondary" onClick={() => setShowExportMenu(!showExportMenu)}>
              Exportar ↓
            </button>
            {showExportMenu && (
              <div className="export-menu active">
                <button onClick={handleExportCSV}>📄 CSV</button>
                <button onClick={handleExportJSON}>💾 JSON</button>
              </div>
            )}
          </div>
          <button className="btn btn-sm btn-danger" onClick={logout}>
            🚪 Sair
          </button>
          <div className={`header-balance ${totalBalance >= 0 ? 'positive' : 'negative'}`}>
            {fmt(totalBalance)}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{ padding: '1rem' }}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'lancamentos' && <Transactions showNotification={showNotification} />}
        {activeTab === 'futuros' && <ScheduledTransactions showNotification={showNotification} />}
        {activeTab === 'cartoes' && <CreditCards showNotification={showNotification} />}
        {activeTab === 'bancos' && <Banks showNotification={showNotification} />}
        {activeTab === 'categorias' && <Categories showNotification={showNotification} />}
        {activeTab === 'admin' && <AdminPanel showNotification={showNotification} />}
      </main>

      {/* Notification */}
      {notification && (
        <NotificationArea>
          <Notification type={notification.type}>{notification.message}</Notification>
        </NotificationArea>
      )}

      {/* Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onChangePassword={changePassword}
        showNotification={showNotification}
      />

      {/* Backup Modal */}
      {showBackupModal && (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>💾 Backup e Restore</h3>
              <button
                onClick={() => setShowBackupModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}
              >
                ✕
              </button>
            </div>

            {/* Seção de Backup */}
            <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f0f9ff', borderRadius: '0.5rem', border: '2px solid #3b82f6' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#3b82f6' }}>📤 Criar Backup</h4>
              <p style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '1rem' }}>
                Exporta todos os seus dados (transações, bancos, categorias, cartões) em um arquivo JSON.
                Guarde este arquivo em local seguro para poder restaurar seus dados no futuro.
              </p>
              <button
                className="btn btn-primary"
                onClick={handleBackup}
                disabled={backupLoading}
                style={{ width: '100%' }}
              >
                {backupLoading ? 'Criando backup...' : '📥 Baixar Backup'}
              </button>
            </div>

            {/* Seção de Restore */}
            <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem', border: '2px solid #f59e0b' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#92400e' }}>📥 Restaurar Backup</h4>
              <p style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '1rem' }}>
                Importa dados de um arquivo de backup anterior.
              </p>

              {/* Modo de Restore */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Modo de importação:
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="restoreMode"
                    value="merge"
                    checked={restoreMode === 'merge'}
                    onChange={() => setRestoreMode('merge')}
                  />
                  <span>
                    <strong>Mesclar</strong> - Adiciona aos dados existentes
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="restoreMode"
                    value="replace"
                    checked={restoreMode === 'replace'}
                    onChange={() => setRestoreMode('replace')}
                  />
                  <span>
                    <strong>Substituir</strong> - Apaga tudo e importa (⚠️ perigoso)
                  </span>
                </label>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestore}
                style={{ display: 'none' }}
                id="backup-file-input"
              />
              <label
                htmlFor="backup-file-input"
                className="btn btn-secondary"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  cursor: backupLoading ? 'wait' : 'pointer',
                  background: restoreMode === 'replace' ? '#ef4444' : undefined,
                  color: restoreMode === 'replace' ? 'white' : undefined
                }}
              >
                {backupLoading ? 'Restaurando...' : '📂 Selecionar Arquivo de Backup'}
              </label>
            </div>

            {/* Info */}
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>
                💡 <strong>Dica:</strong> Faça backup regularmente para não perder seus dados.
                O arquivo JSON pode ser aberto em qualquer editor de texto.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return <AppContent />;
}
