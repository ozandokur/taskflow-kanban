import BoardClient from '@/components/BoardClient';

export default function BoardPage({ params }: { params: { boardId: string } }) {
  return <BoardClient boardId={params.boardId} />;
}
