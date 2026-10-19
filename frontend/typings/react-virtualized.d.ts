// The parts of react-virtualized 9 the TypeScript index pages use (no @types package
// is installed). Grid and WindowScroller as the author and book indexes drive them;
// CellMeasurer for the bookshelf's variable row heights.
/* eslint-disable react/no-multi-comp */
declare module 'react-virtualized' {
  import { Component, CSSProperties, ReactNode } from 'react';

  export interface GridCellProps {
    key: string;
    rowIndex: number;
    columnIndex: number;
    isScrolling: boolean;
    isVisible: boolean;
    parent: unknown;
    style: CSSProperties;
  }

  export interface GridProps {
    className?: string;
    autoHeight?: boolean;
    height: number;
    width: number;
    columnCount: number;
    columnWidth: number;
    rowCount: number;
    rowHeight: number;
    scrollTop?: number;
    overscanRowCount?: number;
    scrollToAlignment?: 'auto' | 'end' | 'start' | 'center';
    isScrollingOptOut?: boolean;
    cellRenderer: (props: GridCellProps) => ReactNode;
    onScroll?: (params: { scrollTop: number; scrollLeft: number }) => void;
  }

  export class Grid extends Component<GridProps> {
    recomputeGridSize(params?: {
      columnIndex?: number;
      rowIndex?: number;
    }): void;
    scrollToCell(params: { columnIndex: number; rowIndex: number }): void;
    scrollToPosition(params: { scrollLeft?: number; scrollTop: number }): void;
  }

  export interface WindowScrollerChildProps {
    height: number;
    width: number;
    isScrolling: boolean;
    scrollTop: number;
    scrollLeft: number;
    registerChild: (element: Element | null) => void;
    onChildScroll: (params: { scrollTop: number }) => void;
  }

  export interface WindowScrollerProps {
    scrollElement?: Element | Window | null;
    children: (props: WindowScrollerChildProps) => ReactNode;
  }

  export class WindowScroller extends Component<WindowScrollerProps> {}

  export class CellMeasurerCache {
    constructor(params: { defaultHeight?: number; fixedWidth?: boolean });
    rowHeight: (params: { index: number }) => number;
    clearAll(): void;
  }

  export interface CellMeasurerChildProps {
    registerChild: (element: Element | null) => void;
    measure: () => void;
  }

  export interface CellMeasurerProps {
    cache: CellMeasurerCache;
    parent: unknown;
    columnIndex: number;
    rowIndex: number;
    children: (props: CellMeasurerChildProps) => ReactNode;
  }

  export class CellMeasurer extends Component<CellMeasurerProps> {}
}
