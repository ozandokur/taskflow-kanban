'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { login, signup } from '@/lib/storage';

export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isSignup = mode === 'signup';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        await signup(name, email, password);
      } else {
        await login(email, password);
      }
      router.push('/boards');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <span className="badge">TaskFlow</span>
        <h1>{isSignup ? 'Hesap Oluştur' : 'Giriş Yap'}</h1>
        <p>
          {isSignup
            ? 'Gerçek Supabase Auth ile kayıt ol.'
            : 'Supabase oturumunla boardlarına dön.'}
        </p>

        {isSignup && (
          <label>
            Ad Soyad
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              required
            />
          </label>
        )}

        <label>
          E-posta
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="demo@taskflow.app"
            required
          />
        </label>

        <label>
          Şifre
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>

        {error && <div className="error-box">{error}</div>}

        <button className="primary-btn" type="submit" disabled={loading}>
          {loading ? 'Bekleyin...' : isSignup ? 'Hesap Oluştur' : 'Giriş Yap'}
        </button>

        <div className="switch-text">
          {isSignup ? 'Zaten hesabın var mı?' : 'Hesabın yok mu?'}{' '}
          <Link href={isSignup ? '/login' : '/signup'}>
            {isSignup ? 'Giriş yap' : 'Kayıt ol'}
          </Link>
        </div>
      </form>
    </div>
  );
}