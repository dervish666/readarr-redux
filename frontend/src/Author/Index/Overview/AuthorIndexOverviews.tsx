import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Grid, GridCellProps, WindowScroller } from 'react-virtualized';
import Author from 'Author/Author';
import Measure from 'Components/Measure';
import dimensions from 'Styles/Variables/dimensions';
import getIndexOfFirstCharacter from 'Utilities/Array/getIndexOfFirstCharacter';
import { useAuthorIndexOverviewOptions } from '../authorIndexOptionsStore';
import AuthorIndexOverview from './AuthorIndexOverview';
import {
  POSTER_PROGRESS_GAP,
  ROW_BORDER,
  ROW_VERTICAL_PADDING,
} from './overviewLayout';
import styles from './AuthorIndexOverviews.module.css';

const progressBarHeight = parseInt(dimensions.progressBarSmallHeight);
const detailedProgressBarHeight = parseInt(dimensions.progressBarMediumHeight);

interface AuthorIndexOverviewsProps {
  items: Author[];
  sortKey: string;
  jumpToCharacter?: string;
  scrollTop?: number;
  scroller: HTMLElement;
  isSmallScreen: boolean;
}

function AuthorIndexOverviews(props: AuthorIndexOverviewsProps) {
  const {
    items,
    sortKey,
    jumpToCharacter,
    scrollTop,
    scroller,
    isSmallScreen,
  } = props;

  const { size: posterSize, detailedProgressBar } =
    useAuthorIndexOverviewOptions();

  const gridRef = useRef<Grid>(null);
  const scrollRestored = useRef(false);
  const [width, setWidth] = useState(0);

  // Author images are square, so the poster is as tall as it is wide.
  const posterWidth = useMemo(() => {
    const maximumPosterWidth = isSmallScreen ? 152 : 162;

    if (posterSize === 'large') {
      return maximumPosterWidth;
    }

    if (posterSize === 'medium') {
      return Math.floor(maximumPosterWidth * 0.75);
    }

    return Math.floor(maximumPosterWidth * 0.5);
  }, [posterSize, isSmallScreen]);

  const posterHeight = posterWidth;

  // The grid's row height, so it has to match the rendered row.
  const rowHeight = useMemo(() => {
    const progress = detailedProgressBar
      ? detailedProgressBarHeight
      : progressBarHeight;

    return (
      posterHeight +
      POSTER_PROGRESS_GAP +
      progress +
      ROW_VERTICAL_PADDING * 2 +
      ROW_BORDER
    );
  }, [detailedProgressBar, posterHeight]);

  useEffect(() => {
    gridRef.current?.recomputeGridSize();
  }, [items, width, rowHeight]);

  useEffect(() => {
    if (gridRef.current && scrollTop && !scrollRestored.current) {
      scrollRestored.current = true;
      gridRef.current.scrollToPosition({ scrollTop });
    }
  });

  useEffect(() => {
    if (jumpToCharacter == null) {
      return;
    }

    const index = getIndexOfFirstCharacter(items, sortKey, jumpToCharacter);

    if (gridRef.current && index != null && index > -1) {
      gridRef.current.scrollToCell({ rowIndex: index, columnIndex: 0 });
    }
  }, [jumpToCharacter, items, sortKey]);

  const handleMeasure = useCallback(({ width }: { width: number }) => {
    setWidth(width);
  }, []);

  const cellRenderer = useCallback(
    ({ key, rowIndex, style }: GridCellProps) => {
      const author = items[rowIndex];

      if (!author) {
        return null;
      }

      return (
        <div key={key} style={style}>
          <AuthorIndexOverview
            authorId={author.id}
            sortKey={sortKey}
            posterWidth={posterWidth}
            posterHeight={posterHeight}
            rowHeight={rowHeight}
          />
        </div>
      );
    },
    [items, sortKey, posterWidth, posterHeight, rowHeight]
  );

  return (
    <Measure onMeasure={handleMeasure}>
      <WindowScroller scrollElement={isSmallScreen ? undefined : scroller}>
        {({ height, registerChild, onChildScroll, scrollTop }) => {
          if (!height) {
            return <div />;
          }

          return (
            <div ref={registerChild}>
              <Grid
                ref={gridRef}
                className={styles.grid}
                autoHeight={true}
                height={height}
                columnCount={1}
                columnWidth={width}
                rowCount={items.length}
                rowHeight={rowHeight}
                width={width}
                scrollTop={scrollTop}
                overscanRowCount={2}
                cellRenderer={cellRenderer}
                scrollToAlignment="start"
                isScrollingOptOut={true}
                onScroll={onChildScroll}
              />
            </div>
          );
        }}
      </WindowScroller>
    </Measure>
  );
}

export default AuthorIndexOverviews;
