'use client';

import { useMemo } from 'react';
// @ts-ignore - react-window types issue
import { FixedSizeList as List } from 'react-window';
import { Staff } from '@/types';

interface VirtualizedStaffListProps {
  staff: Staff[];
  height?: number;
  itemHeight?: number;
  renderStaffItem: (staff: Staff, index: number) => React.ReactNode;
}

export function VirtualizedStaffList({
  staff,
  height = 600,
  itemHeight = 120,
  renderStaffItem,
}: VirtualizedStaffListProps) {
  // Memoize the row renderer to avoid recreating on every render
  const Row = useMemo(
    () =>
      ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const staffMember = staff[index];
        return (
          <div style={style}>
            {renderStaffItem(staffMember, index)}
          </div>
        );
      },
    [staff, renderStaffItem]
  );

  if (staff.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Không có nhân viên nào
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={staff.length}
      itemSize={itemHeight}
      width="100%"
      className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
    >
      {Row}
    </List>
  );
}
