'use client';

import React, { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { AuthScreen } from '@/components/finance/AuthScreen';
import { Dashboard } from '@/components/finance/Dashboard';
import { Transactions } from '@/components/finance/Transactions';
import { CreditCards } from '@/components/finance/CreditCards';
import { Banks } from '@/components/finance/Banks';
import { Categories } from '@/components/finance/Categories';
import { AdminPanel } from '@/components/finance/AdminPanel';
import { NotificationArea, Notification } from '@/components/finance/Notification';
import { ChangePasswordModal } from '@/components/finance/Modals';
import { ADMIN_EMAILS } from '@/lib/types';

function AppContent() {
  const { user, loading, logout, isOnline, banks, getBankBalance, changePassword, isExpired, expiresAt } = useFinance();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

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

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'lancamentos', label: 'Lançamentos', icon: '📝' },
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
    </div>
  );
}

export default function Home() {
  return <AppContent />;
}
