'use client';

import React, { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthScreen() {
  const { login, register } = useFinance();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) await login(email, password);
      else await register(email, password);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleClearSession = () => {
    // Limpar todos os dados do Supabase do localStorage
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.startsWith('sb-') || key.includes('supabase')
    );
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('Sessão limpa. Chaves removidas:', keysToRemove);
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">💰</div>
          <CardTitle className="text-2xl">Sistema Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Criar Conta')}</Button>
            <p className="text-center text-sm">
              {isLogin ? 'Não tem conta?' : 'Já tem conta?'}
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-blue-600 ml-1 font-medium">
                {isLogin ? 'Criar conta' : 'Fazer login'}
              </button>
            </p>
            <hr className="my-4" />
            <Button 
              type="button" 
              variant="outline" 
              className="w-full text-gray-500" 
              onClick={handleClearSession}
            >
              🔄 Limpar Sessão (Resolver Problemas)
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
