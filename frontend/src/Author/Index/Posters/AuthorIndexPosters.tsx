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
import {
  AuthorIndexPosterOptions,
  PosterSize,
  useAuthorIndexPosterOptions,
} from '../authorIndexOptionsStore';
import AuthorIndexPoster from './AuthorIndexPoster';
import styles from './AuthorIndexPosters.css';

const columnPadding = parseInt(dimensions.authorIndexColumnPadding);
const columnPaddingSmallScreen = parseInt(
  dimensions.authorIndexColumnPaddingSmallScreen
);
const progressBarHeight = parseInt(dimensions.progressBarSmallHeight);
const detailedProgressBarHeight = parseInt(dimensions.progressBarMediumHeight);

// Mirror AuthorIndexPoster.css: 6px gap between the stacked pieces, 4px padding below.
const GAP = 6;
const BOTTOM_PADDING = 4;
const TITLE_HEIGHT = 6 + 20;
const LINE_HEIGHT = 18;

const ADDITIONAL_COLUMN_COUNT: Record<PosterSize, number> = {
  small: 3,
  medium: 2,
  large: 1,
};

function calculateColumnWidth(
  width: number,
  posterSize: PosterSize,
  isSmallScreen: boolean
) {
  const maximumColumnWidth = isSmallScreen ? 172 : 182;
  const columns = Math.floor(width / maximumColumnWidth);
  const remainder = width % maximumColumnWidth;

  if (remainder === 0 && posterSize === 'large') {
    return maximumColumnWidth;
  }

  return Math.floor(width / (columns + ADDITIONAL_COLUMN_COUNT[posterSize]));
}

function calculateRowHeight(
  posterHeight: number,
  sortKey: string,
  padding: number,
  posterOptions: AuthorIndexPosterOptions
) {
  const { detailedProgressBar, showTitle, showMonitored, showQualityProfile } =
    posterOptions;

  let height =
    padding * 2 +
    posterHeight +
    GAP +
    (detailedProgressBar ? detailedProgressBarHeight : progressBarHeight) +
    BOTTOM_PADDING;

  if (showTitle !== 'no') {
    height += GAP + TITLE_HEIGHT;
  }

  if (showMonitored || showQualityProfile) {
    height += GAP + LINE_HEIGHT;
  }

  switch (sortKey) {
    case 'added':
    case 'nextBook':
    case 'lastBook':
    case 'bookCount':
    case 'path':
    case 'sizeOnDisk':
    case 'metadataProfileId':
      height += GAP + LINE_HEIGHT;
      break;
    case 'qualityProfileId':
      if (!showQualityProfile) {
        height += GAP + LINE_HEIGHT;
      }
      break;
    default:
    // No extra line
  }

  return height;
}

interface AuthorIndexPostersProps {
  items: Author[];
  sortKey: string;
  jumpToCharacter?: string;
  scrollTop?: number;
  scroller: HTMLElement;
  isSmallScreen: boolean;
}

function AuthorIndexPosters(props: AuthorIndexPostersProps) {
  const {
    items,
    sortKey,
    jumpToCharacter,
    scrollTop,
    scroller,
    isSmallScreen,
  } = props;

  const posterOptions = useAuthorIndexPosterOptions();
  const gridRef = useRef<Grid>(null);
  const scrollRestored = useRef(false);
  const [width, setWidth] = useState(0);

  const padding = isSmallScreen ? columnPaddingSmallScreen : columnPadding;

  const { columnWidth, columnCount, posterWidth, posterHeight, rowHeight } =
    useMemo(() => {
      const columnWidth = calculateColumnWidth(
        width,
        posterOptions.size,
        isSmallScreen
      );
      const columnCount = Math.max(Math.floor(width / columnWidth), 1);
      const posterWidth = columnWidth - padding * 2;
      const posterHeight = Math.ceil(posterWidth);

      return {
        columnWidth,
        columnCount,
        posterWidth,
        posterHeight,
        rowHeight: calculateRowHeight(
          posterHeight,
          sortKey,
          padding,
          posterOptions
        ),
      };
    }, [width, posterOptions, isSmallScreen, padding, sortKey]);

  const rowCount = Math.ceil(items.length / columnCount);

  useEffect(() => {
    // Discard cached cells when the layout or the items change.
    gridRef.current?.recomputeGridSize();
  }, [items, columnWidth, columnCount, rowHeight]);

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
      gridRef.current.scrollToCell({
        rowIndex: Math.floor(index / columnCount),
        columnIndex: 0,
      });
    }
  }, [jumpToCharacter, items, sortKey, columnCount]);

  const handleMeasure = useCallback(({ width }: { width: number }) => {
    setWidth(width);
  }, []);

  const cellRenderer = useCallback(
    ({ key, rowIndex, columnIndex, style }: GridCellProps) => {
      const author = items[rowIndex * columnCount + columnIndex];

      if (!author) {
        return null;
      }

      return (
        <div key={key} style={{ ...style, padding }}>
          <AuthorIndexPoster
            authorId={author.id}
            sortKey={sortKey}
            posterWidth={posterWidth}
            posterHeight={posterHeight}
          />
        </div>
      );
    },
    [items, columnCount, padding, sortKey, posterWidth, posterHeight]
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
                columnCount={columnCount}
                columnWidth={columnWidth}
                rowCount={rowCount}
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

export default AuthorIndexPosters;
