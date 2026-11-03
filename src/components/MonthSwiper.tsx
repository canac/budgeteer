import { Loader, Stack, Title } from "@mantine/core";
import { addMonths, differenceInCalendarMonths, parseISO } from "date-fns";
import { type ReactNode, type TouchEvent, useLayoutEffect, useRef, useState } from "react";
import { useHydrated } from "~/hooks/useHydrated";
import { range } from "~/lib/collections";
import { monthFormatter } from "~/lib/formatters";
import { toISOMonthString } from "~/lib/iso";
import classes from "./MonthSwiper.module.css";

interface MonthSwiperProps {
  month: string;
  firstMonth: string;
  lastMonth: string;
  preload: (month: string) => void;
  onSwipe: (month: string) => void;
  children: ReactNode;
}

/**
 * Renders `month` among placeholder pages for every month from `firstMonth` to `lastMonth` in a
 * horizontal scroll snap container. Calls `onSwipe` with the month a touch swipe
 * settles on, and keeps swiping through placeholders while it loads. Stays mounted across months,
 * so a month that loads mid-swipe doesn't interrupt the swipe. Calls `preload` with the visible
 * month's neighbors when a touch starts.
 */
export function MonthSwiper({
  month,
  firstMonth,
  lastMonth,
  preload,
  onSwipe,
  children,
}: MonthSwiperProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [visibleMonth, setVisibleMonth] = useState(month);
  const [renderedMonth, setRenderedMonth] = useState(month);
  // A swiped month that loads already matches `visibleMonth`, so this only moves for other navigation
  if (month !== renderedMonth) {
    setRenderedMonth(month);
    setVisibleMonth(month);
  }
  // Placeholders are added after hydration so the server render doesn't flash the previous month
  const hydrated = useHydrated();
  const pageMonths = hydrated ? getPageMonths(firstMonth, lastMonth) : [visibleMonth];
  const currentIndex = pageMonths.indexOf(visibleMonth);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    // A swipe already scrolled to its month, and iOS ignores scrolling while a finger is down
    if (scroller && getScrolledIndex(scroller) !== currentIndex) {
      scroller.scrollLeft = currentIndex * scroller.clientWidth;
    }
  }, [currentIndex]);

  const settle = (scroller: HTMLDivElement) => {
    const swipedMonth = pageMonths[getScrolledIndex(scroller)];
    if (swipedMonth && swipedMonth !== visibleMonth) {
      setVisibleMonth(swipedMonth);
      onSwipe(swipedMonth);
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const index = getScrolledIndex(event.currentTarget);
    for (const neighbor of [pageMonths[index - 1], pageMonths[index + 1]]) {
      if (neighbor) {
        preload(neighbor);
      }
    }
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const scroller = event.currentTarget;
    // A touch that starts just as the snap lands swallows its scrollend
    if (Math.abs(scroller.scrollLeft - getScrolledIndex(scroller) * scroller.clientWidth) <= 1) {
      settle(scroller);
    }
  };

  return (
    <div
      ref={scrollerRef}
      className={classes.scroller}
      data-scroll-restoration="off"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onScrollEnd={(event) => settle(event.currentTarget)}
    >
      {pageMonths.map((pageMonth) => (
        <div key={pageMonth} className={classes.page}>
          {pageMonth === month ? children : <MonthPlaceholder month={pageMonth} />}
        </div>
      ))}
    </div>
  );
}

function getScrolledIndex(scroller: HTMLDivElement): number {
  return Math.round(scroller.scrollLeft / scroller.clientWidth);
}

// Every month stays rendered, so swipes never re-center the scroller, which iOS ignores mid-touch
function getPageMonths(firstMonth: string, lastMonth: string): string[] {
  const first = parseISO(firstMonth);
  const count = differenceInCalendarMonths(parseISO(lastMonth), first) + 1;
  return range(Math.max(count, 1)).map((index) => toISOMonthString(addMonths(first, index)));
}

function MonthPlaceholder({ month }: { month: string }) {
  return (
    <Stack align="center" aria-hidden>
      <Title order={1}>{monthFormatter.format(parseISO(month))}</Title>
      <Loader />
    </Stack>
  );
}
