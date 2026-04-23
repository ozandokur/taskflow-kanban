import type { Card } from '@/lib/storage';

export function arrayMove<T>(array: T[], from: number, to: number) {
  const next = [...array];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function buildColumnCardMap(
  columns: Array<{
    id: string;
    title: string;
    position: number;
    createdAt: string;
    cards: Card[];
  }>,
) {
  return Object.fromEntries(columns.map((column) => [column.id, column.cards]));
}