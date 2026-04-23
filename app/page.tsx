'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/storage';

export default function HomePage() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    void (async () => {
      const user = await getCurrentUser();
      setLoggedIn(Boolean(user));
    })();
  }, []);

  return (
    <main className="landing-shell">
      <section className="hero-card">
        <span className="badge">TaskFlow</span>
        <h1>Küçük ekipler için sade ve hızlı Kanban yönetimi</h1>
        <p>
          Board oluştur, kolon ve kart ekle, kartları sürükleyip bırak, sıralamayı kalıcı tut.
          Bu sürüm Supabase Auth ve Postgres ile çalışır.
        </p>

        <div className="hero-actions">
          <Link className="primary-btn" href={loggedIn ? '/boards' : '/signup'}>
            {loggedIn ? 'Boardlara Git' : 'Hemen Başla'}
          </Link>
          <Link className="secondary-btn" href="/login">
            Giriş Yap
          </Link>
        </div>
      </section>
    </main>
  );
}