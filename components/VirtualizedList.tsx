'use client';

import { useMemo } from 'react';
// @ts-ignore - react-window types issue
import { FixedSizeList as List } from 'react-window';

interface VirtualizedListProps<T> {
  items: T[];
  height?: number;
  itemHeight?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
}

export function VirtualizedList<T>({
  items,
  height = 600,
  itemHeight = 100,
  renderItem,
  emptyMessage = 'Không có dữ liệu',
}: VirtualizedListProps<T>) {
  // Memoize the row renderer to avoid recreating on every render
  const Row = useMemo(
    () =>
      ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const item = items[index];
        return (
          <div style={style} className="px-1">
            {renderItem(item, index)}
          </div>
        );
      },
    [items, renderItem]
  );

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      width="100%"
      className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
    >
      {Row}
    </List>
  );
}
