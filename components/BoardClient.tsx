'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  addCard,
  addColumn,
  getBoardData,
  getCurrentUser,
  moveCard,
  moveCardByStep,
  renameColumn,
  updateCard,
  type Card,
} from '@/lib/storage';

type BoardData = Awaited<ReturnType<typeof getBoardData>>;

export default function BoardClient({ boardId }: { boardId: string }) {
  const router = useRouter();
  const [data, setData] = useState<BoardData>(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newCardTitles, setNewCardTitles] = useState<Record<string, string>>({});
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 4,
      },
    }),
  );

  const load = async () => {
    const user = await getCurrentUser();

    if (!user) {
      router.replace('/login');
      return;
    }

    const next = await getBoardData(boardId);

    if (!next || next.board.ownerId !== user.id) {
      router.replace('/boards');
      return;
    }

    setData(next);
  };

  useEffect(() => {
    void load();
  }, [boardId]);

  const columnMap = useMemo(() => {
    return Object.fromEntries((data?.columns ?? []).map((col) => [col.id, col]));
  }, [data]);

  const cardMap = useMemo(() => {
    const cards = (data?.columns ?? []).flatMap((column) => column.cards);
    return Object.fromEntries(cards.map((card) => [card.id, card]));
  }, [data]);

  const findColumnByCardId = (cardId: string) => {
    return data?.columns.find((column) => column.cards.some((card) => card.id === cardId)) ?? null;
  };

  const getColumnDropId = (columnId: string) => `column-drop-${columnId}`;

  const getColumnIdFromDropTarget = (targetId: string) => {
    if (targetId.startsWith('column-drop-')) {
      return targetId.replace('column-drop-', '');
    }
    return null;
  };

  const moveCardInState = (
    current: NonNullable<BoardData>,
    activeId: string,
    targetColumnId: string,
    targetIndex: number,
  ): NonNullable<BoardData> => {
    const nextColumns = current.columns.map((column) => ({
      ...column,
      cards: [...column.cards],
    }));

    let movedCard: Card | null = null;

    for (const column of nextColumns) {
      const currentIndex = column.cards.findIndex((card) => card.id === activeId);
      if (currentIndex !== -1) {
        movedCard = { ...column.cards[currentIndex], columnId: targetColumnId };
        column.cards.splice(currentIndex, 1);
        break;
      }
    }

    if (!movedCard) return current;

    const targetColumn = nextColumns.find((column) => column.id === targetColumnId);
    if (!targetColumn) return current;

    const safeIndex = Math.max(0, Math.min(targetIndex, targetColumn.cards.length));
    targetColumn.cards.splice(safeIndex, 0, movedCard);

    return {
      ...current,
      columns: nextColumns,
    };
  };

  const onAddColumn = async (e: FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;

    await addColumn(boardId, newColumnTitle);
    setNewColumnTitle('');
    await load();
  };

  const onAddCard = async (columnId: string, e: FormEvent) => {
    e.preventDefault();
    const title = newCardTitles[columnId]?.trim();
    if (!title) return;

    await addCard(columnId, title);
    setNewCardTitles((prev) => ({ ...prev, [columnId]: '' }));
    await load();
  };

  const onRenameColumn = async (columnId: string, nextTitle: string) => {
    if (!nextTitle.trim()) return;
    await renameColumn(columnId, nextTitle);
    await load();
  };

  const onMoveStep = async (
    cardId: string,
    direction: 'up' | 'down',
    targetColumnId?: string,
  ) => {
    if (targetColumnId === undefined) {
      await moveCardByStep(cardId, direction);
    } else {
      await moveCardByStep(cardId, direction, targetColumnId);
    }
    await load();
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    const card = cardMap[id];
    if (card) setActiveCard(card);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);

    const { active, over } = event;
    if (!over || !data || saving) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const previousData = data;

    const droppedColumnId = getColumnIdFromDropTarget(overId);

    if (droppedColumnId) {
      const targetColumn = data.columns.find((column) => column.id === droppedColumnId);
      if (!targetColumn) return;

      const optimistic = moveCardInState(data, activeId, targetColumn.id, targetColumn.cards.length);
      setData(optimistic);
      setSaving(true);

      try {
        await moveCard(activeId, targetColumn.id, targetColumn.cards.length);
        await load();
      } catch {
        setData(previousData);
      } finally {
        setSaving(false);
      }
      return;
    }

    const targetColumn = findColumnByCardId(overId);
    if (!targetColumn) return;

    const targetIndex = targetColumn.cards.findIndex((card) => card.id === overId);
    if (targetIndex === -1) return;

    const optimistic = moveCardInState(data, activeId, targetColumn.id, targetIndex);
    setData(optimistic);
    setSaving(true);

    try {
      await moveCard(activeId, targetColumn.id, targetIndex);
      await load();
    } catch {
      setData(previousData);
    } finally {
      setSaving(false);
    }
  };

  if (!data) return null;

  return (
    <main className="board-page-shell">
      <header className="topbar sticky">
        <div>
          <Link className="back-link" href="/boards">
            ← Boardlara dön
          </Link>
          <h1>{data.board.title}</h1>
          <p className="muted-text">
            dnd-kit ile kartları sürükle-bırak yap, sayfa yenileyince sıra korunsun.
          </p>
        </div>
      </header>

      <section className="board-toolbar">
        <form className="inline-form" onSubmit={onAddColumn}>
          <input
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            placeholder="Yeni sütun adı"
          />
          <button className="primary-btn" type="submit">
            Sütun Ekle
          </button>
        </form>
      </section>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={(event) => void handleDragEnd(event)}
      >
        <section className="kanban-scroll">
          <div className="kanban-row">
            {data.columns.map((column, columnIndex) => {
              const prevColumnId = data.columns[columnIndex - 1]?.id;
              const nextColumnId = data.columns[columnIndex + 1]?.id;

              return (
                <DroppableColumn key={column.id} id={getColumnDropId(column.id)}>
                  <div className="column-header">
                    <input
                      className="column-title-input"
                      defaultValue={column.title}
                      onBlur={(e) => void onRenameColumn(column.id, e.target.value)}
                    />
                    <span className="count-pill">{column.cards.length}</span>
                  </div>

                  <SortableContext
                    items={column.cards.map((card) => card.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="card-list droppable-column">
                      {column.cards.map((card) => (
                        <SortableCard
                          key={card.id}
                          card={card}
                          onClick={() => {
                            if (saving) return;
                            setEditingCard(card);
                          }}
                        />
                      ))}

                      {column.cards.length === 0 && (
                        <EmptyColumnDropZone id={getColumnDropId(column.id)} />
                      )}
                    </div>
                  </SortableContext>

                  <form className="add-card-form" onSubmit={(e) => void onAddCard(column.id, e)}>
                    <input
                      value={newCardTitles[column.id] ?? ''}
                      onChange={(e) =>
                        setNewCardTitles((prev) => ({
                          ...prev,
                          [column.id]: e.target.value,
                        }))
                      }
                      placeholder="Yeni kart başlığı"
                    />
                    <button className="secondary-btn" type="submit">
                      Kart Ekle
                    </button>
                  </form>

                  <div className="column-move-hint">
                    <span>Sürükle-bırak çalışmazsa hızlı taşı:</span>
                  </div>

                  <div className="mobile-actions mobile-actions-column">
                    {column.cards.length > 0 &&
                      column.cards.map((card) => (
                        <div key={card.id} className="mobile-move-row">
                          <span className="mobile-move-title">{card.title}</span>
                          <div className="mobile-move-buttons">
                            <button type="button" onClick={() => void onMoveStep(card.id, 'up')}>
                              ↑
                            </button>
                            <button type="button" onClick={() => void onMoveStep(card.id, 'down')}>
                              ↓
                            </button>
                            {prevColumnId && (
                              <button
                                type="button"
                                onClick={() => void onMoveStep(card.id, 'up', prevColumnId)}
                              >
                                ←
                              </button>
                            )}
                            {nextColumnId && (
                              <button
                                type="button"
                                onClick={() => void onMoveStep(card.id, 'down', nextColumnId)}
                              >
                                →
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </DroppableColumn>
              );
            })}
          </div>
        </section>

        <DragOverlay>
          {activeCard ? (
            <div className="task-card task-card-dragging task-card-overlay">
              <div className="task-card-top">
                <span className="task-title">{activeCard.title}</span>
                <span className="drag-hint">↕</span>
              </div>
              <p>{activeCard.description || 'Detay eklemek için karta tıkla.'}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {editingCard && (
        <EditCardModal
          card={editingCard}
          columnTitle={columnMap[editingCard.columnId]?.title ?? ''}
          onClose={() => {
            setEditingCard(null);
            void load();
          }}
        />
      )}
    </main>
  );
}

function DroppableColumn({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <article
      ref={setNodeRef}
      className={`column-card ${isOver ? 'column-card-active-drop' : ''}`}
    >
      {children}
    </article>
  );
}

function SortableCard({
  card,
  onClick,
}: {
  card: Card;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <button
        type="button"
        className={`task-card ${isDragging ? 'task-card-dragging' : ''}`}
        onClick={onClick}
        {...attributes}
        {...listeners}
      >
        <div className="task-card-top">
          <span className="task-title">{card.title}</span>
          <span className="drag-hint">↕</span>
        </div>
        <p>{card.description || 'Detay eklemek için karta tıkla.'}</p>
      </button>
    </div>
  );
}

function EmptyColumnDropZone({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`empty-column-hint ${isOver ? 'empty-column-hint-active' : ''}`}
    >
      Kartı buraya bırak
    </div>
  );
}

function EditCardModal({
  card,
  columnTitle,
  onClose,
}: {
  card: Card;
  columnTitle: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    await updateCard(card.id, { title, description });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="badge subtle">{columnTitle}</span>
            <h2>Kart Detayı</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="modal-form" onSubmit={(e) => void onSave(e)}>
          <label>
            Başlık
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>

          <label>
            Açıklama
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
            />
          </label>

          <div className="modal-actions">
            <button className="secondary-btn" type="button" onClick={onClose}>
              Vazgeç
            </button>
            <button className="primary-btn" type="submit">
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}