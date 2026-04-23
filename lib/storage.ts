import { createClient } from '@/lib/supabase/client';

export type User = {
  id: string;
  name: string;
  email: string;
};

export type Card = {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type Column = {
  id: string;
  boardId: string;
  title: string;
  position: number;
  createdAt: string;
};

export type Board = {
  id: string;
  ownerId: string;
  title: string;
  createdAt: string;
};

type DbProfile = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

type DbBoard = {
  id: string;
  owner_id: string;
  title: string;
  created_at: string;
};

type DbColumn = {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: string;
};

type DbCard = {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description: string;
  position: number;
  created_at: string;
  updated_at: string;
};

function mapBoard(row: DbBoard): Board {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    createdAt: row.created_at,
  };
}

function mapColumn(row: DbColumn): Column {
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    position: Number(row.position),
    createdAt: row.created_at,
  };
}

function mapCard(row: DbCard): Card {
  return {
    id: row.id,
    boardId: row.board_id,
    columnId: row.column_id,
    title: row.title,
    description: row.description,
    position: Number(row.position),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, created_at')
    .eq('id', user.id)
    .maybeSingle<DbProfile>();

  return {
    id: user.id,
    name: profile?.full_name ?? (user.user_metadata?.full_name as string) ?? 'Kullanıcı',
    email: profile?.email ?? user.email ?? '',
  };
}

export async function signup(name: string, email: string, password: string) {
  const supabase = createClient();
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        full_name: trimmedName,
      },
    },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Kullanıcı oluşturulamadı.');

  if (!data.session) {
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (loginError) {
      throw new Error(
        'Kayıt oluştu ama oturum açılamadı. Supabase içinde email doğrulamasını kapat ya da doğrulamayı tamamla.',
      );
    }
  }

  const {
    data: { user: signedInUser },
  } = await supabase.auth.getUser();

  if (!signedInUser) {
    throw new Error('Oturum doğrulanamadı.');
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: signedInUser.id,
      full_name: trimmedName,
      email: normalizedEmail,
    },
    { onConflict: 'id' },
  );

  if (profileError) throw new Error(profileError.message);

  await createStarterBoard(signedInUser.id);
  return signedInUser;
}

export async function login(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw new Error('E-posta veya şifre hatalı.');
  return data.user;
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function getUserBoards(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('boards')
    .select('id, owner_id, title, created_at')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapBoard(row as DbBoard));
}

export async function createBoard(ownerId: string, title: string) {
  const supabase = createClient();

  const { data: board, error } = await supabase
    .from('boards')
    .insert({
      owner_id: ownerId,
      title: title.trim(),
    })
    .select('id, owner_id, title, created_at')
    .single<DbBoard>();

  if (error || !board) throw new Error(error?.message ?? 'Board oluşturulamadı.');

  const defaultColumns = ['Todo', 'In Progress', 'Done'];
  const payload = defaultColumns.map((colTitle, index) => ({
    board_id: board.id,
    title: colTitle,
    position: (index + 1) * 1000,
  }));

  const { error: columnError } = await supabase.from('columns').insert(payload);
  if (columnError) throw new Error(columnError.message);

  return mapBoard(board);
}

export async function createStarterBoard(ownerId: string) {
  const supabase = createClient();

  const { data: existing, error: existingError } = await supabase
    .from('boards')
    .select('id')
    .eq('owner_id', ownerId)
    .limit(1);

  if (existingError) throw new Error(existingError.message);
  if (existing && existing.length > 0) return;

  const board = await createBoard(ownerId, 'İlk TaskFlow Board');
  const columns = await getBoardColumns(board.id);

  const todo = columns[0];
  const progress = columns[1];
  const done = columns[2];

  await addCard(todo.id, 'Auth ekranı', 'Kayıt ve giriş akışını tamamla.');
  await addCard(todo.id, 'Board ekranı', 'Kolonları ve kart bileşenlerini tasarla.');
  await addCard(progress.id, 'Drag & drop', 'Kartları kolonlar arasında taşı.');
  await addCard(done.id, 'Proje planı', 'İlk MVP kapsamını netleştir.');
}

export async function getBoard(boardId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('boards')
    .select('id, owner_id, title, created_at')
    .eq('id', boardId)
    .maybeSingle<DbBoard>();

  if (error) throw new Error(error.message);
  return data ? mapBoard(data) : null;
}

export async function getBoardColumns(boardId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('columns')
    .select('id, board_id, title, position, created_at')
    .eq('board_id', boardId)
    .order('position', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapColumn(row as DbColumn));
}

export async function getColumnCards(columnId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('cards')
    .select('id, board_id, column_id, title, description, position, created_at, updated_at')
    .eq('column_id', columnId)
    .order('position', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapCard(row as DbCard));
}

export async function addColumn(boardId: string, title: string) {
  const supabase = createClient();
  const currentColumns = await getBoardColumns(boardId);
  const lastPosition = currentColumns.at(-1)?.position ?? 0;

  const { data, error } = await supabase
    .from('columns')
    .insert({
      board_id: boardId,
      title: title.trim(),
      position: lastPosition + 1000,
    })
    .select('id, board_id, title, position, created_at')
    .single<DbColumn>();

  if (error || !data) throw new Error(error?.message ?? 'Sütun eklenemedi.');
  return mapColumn(data);
}

export async function addCard(columnId: string, title: string, description = '') {
  const supabase = createClient();

  const { data: column, error: columnError } = await supabase
    .from('columns')
    .select('id, board_id')
    .eq('id', columnId)
    .single<{ id: string; board_id: string }>();

  if (columnError || !column) throw new Error(columnError?.message ?? 'Sütun bulunamadı.');

  const existing = await getColumnCards(columnId);
  const lastPosition = existing.at(-1)?.position ?? 0;

  const { data, error } = await supabase
    .from('cards')
    .insert({
      board_id: column.board_id,
      column_id: columnId,
      title: title.trim(),
      description: description.trim(),
      position: lastPosition + 1000,
    })
    .select('id, board_id, column_id, title, description, position, created_at, updated_at')
    .single<DbCard>();

  if (error || !data) throw new Error(error?.message ?? 'Kart eklenemedi.');
  return mapCard(data);
}

export async function updateCard(
  cardId: string,
  payload: Partial<Pick<Card, 'title' | 'description'>>,
) {
  const supabase = createClient();

  const updatePayload: Record<string, string> = {};
  if (typeof payload.title === 'string') updatePayload.title = payload.title.trim();
  if (typeof payload.description === 'string') {
    updatePayload.description = payload.description.trim();
  }

  if (Object.keys(updatePayload).length === 0) return;

  const { error } = await supabase.from('cards').update(updatePayload).eq('id', cardId);
  if (error) throw new Error(error.message);
}

export async function renameColumn(columnId: string, title: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('columns')
    .update({ title: title.trim() })
    .eq('id', columnId);

  if (error) throw new Error(error.message);
}

async function reindexColumn(columnId: string, cards: DbCard[]) {
  const supabase = createClient();

  await Promise.all(
    cards.map((card, index) =>
      supabase
        .from('cards')
        .update({
          column_id: columnId,
          position: (index + 1) * 1000,
        })
        .eq('id', card.id),
    ),
  );
}

export async function moveCard(cardId: string, toColumnId: string, targetIndex: number) {
  const supabase = createClient();

  const { data: dragged, error: draggedError } = await supabase
    .from('cards')
    .select('id, board_id, column_id, title, description, position, created_at, updated_at')
    .eq('id', cardId)
    .single<DbCard>();

  if (draggedError || !dragged) throw new Error(draggedError?.message ?? 'Kart bulunamadı.');

  const { data: targetCardsRaw, error: targetError } = await supabase
    .from('cards')
    .select('id, board_id, column_id, title, description, position, created_at, updated_at')
    .eq('column_id', toColumnId)
    .order('position', { ascending: true });

  if (targetError) throw new Error(targetError.message);

  const { data: sourceCardsRaw, error: sourceError } = await supabase
    .from('cards')
    .select('id, board_id, column_id, title, description, position, created_at, updated_at')
    .eq('column_id', dragged.column_id)
    .order('position', { ascending: true });

  if (sourceError) throw new Error(sourceError.message);

  const sourceCards = (sourceCardsRaw ?? []) as DbCard[];
  const targetCards = (targetCardsRaw ?? []) as DbCard[];

  if (dragged.column_id === toColumnId) {
    const reordered = sourceCards.filter((card) => card.id !== dragged.id);
    reordered.splice(targetIndex, 0, { ...dragged, column_id: toColumnId });
    await reindexColumn(toColumnId, reordered);
    return;
  }

  const nextSource = sourceCards.filter((card) => card.id !== dragged.id);
  const nextTarget = [...targetCards];
  nextTarget.splice(targetIndex, 0, { ...dragged, column_id: toColumnId });

  await reindexColumn(dragged.column_id, nextSource);
  await reindexColumn(toColumnId, nextTarget);
}

export async function moveCardByStep(
  cardId: string,
  direction: 'up' | 'down',
  targetColumnId?: string,
) {
  if (targetColumnId) {
    const targetCards = await getColumnCards(targetColumnId);
    const nextIndex = direction === 'up' ? 0 : targetCards.length;
    await moveCard(cardId, targetColumnId, nextIndex);
    return;
  }

  const supabase = createClient();
  const { data: card, error } = await supabase
    .from('cards')
    .select('id, column_id')
    .eq('id', cardId)
    .single<{ id: string; column_id: string }>();

  if (error || !card) throw new Error(error?.message ?? 'Kart bulunamadı.');

  const cards = await getColumnCards(card.column_id);
  const currentIndex = cards.findIndex((item) => item.id === cardId);
  if (currentIndex === -1) return;

  const nextIndex =
    direction === 'up'
      ? Math.max(0, currentIndex - 1)
      : Math.min(cards.length - 1, currentIndex + 1);

  if (nextIndex === currentIndex) return;

  await moveCard(cardId, card.column_id, nextIndex);
}

export async function getBoardData(boardId: string) {
  const board = await getBoard(boardId);
  if (!board) return null;

  const columns = await getBoardColumns(boardId);
  const cardsByColumn = await Promise.all(columns.map((column) => getColumnCards(column.id)));

  return {
    board,
    columns: columns.map((column, index) => ({
      ...column,
      cards: cardsByColumn[index],
    })),
  };
}