'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import {
  createBoard,
  getCurrentUser,
  getUserBoards,
  logout,
  type Board,
  type User,
} from '@/lib/storage';

export default function BoardsClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      router.replace('/login');
      return;
    }

    setUser(currentUser);
    const nextBoards = await getUserBoards(currentUser.id);
    setBoards(nextBoards);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    const board = await createBoard(user.id, title);
    setTitle('');
    router.push(`/boards/${board.id}`);
  };

  const onLogout = async () => {
    await logout();
    router.push('/login');
    router.refresh();
  };

  if (loading) return null;

  return (
    <main className="page-shell">
      <header className="topbar">
        <div>
          <span className="badge">TaskFlow</span>
          <h1>Boardlar</h1>
        </div>

        <div className="topbar-actions">
          <span className="muted-text">{user?.name}</span>
          <button className="secondary-btn" onClick={onLogout}>
            Çıkış Yap
          </button>
        </div>
      </header>

      <section className="create-board-card">
        <div>
          <h2>Yeni board oluştur</h2>
          <p>Küçük ekibin için yeni bir akış başlat.</p>
        </div>

        <form className="inline-form" onSubmit={onCreate}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn. Sprint Planning"
          />
          <button className="primary-btn" type="submit">
            Oluştur
          </button>
        </form>
      </section>

      <section className="boards-grid">
        {boards.map((board) => (
          <Link key={board.id} href={`/boards/${board.id}`} className="board-card-link">
            <article className="board-card">
              <span className="badge subtle">Board</span>
              <h3>{board.title}</h3>
              <p>{new Date(board.createdAt).toLocaleDateString('tr-TR')} tarihinde oluşturuldu.</p>
            </article>
          </Link>
        ))}
      </section>
    </main>
  );
}