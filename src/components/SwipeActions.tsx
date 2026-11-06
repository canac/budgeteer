import type { MantineColor } from "@mantine/core";
import type { ReactNode, TouchEvent, UIEvent } from "react";
import { useLayoutEffect, useRef } from "react";
import { useTouchscreen } from "~/hooks/useTouchscreen";
import classes from "./SwipeActions.module.css";

export interface SwipeAction {
  label: string;
  icon: ReactNode;
  color: MantineColor;
  /** Return a promise if the content stays, like opening a modal, to slide it back once it settles. */
  onTrigger: () => void | Promise<void>;
}

interface SwipeActionsProps {
  /** Revealed on the left when swiping right. */
  swipeRight?: SwipeAction;
  /** Revealed on the right when swiping left. */
  swipeLeft?: SwipeAction;
  children: ReactNode;
}

/**
 * Lets touch users swipe the content sideways to reveal an action, which triggers once the
 * content is swiped more than halfway. Renders only the content on non-touch displays.
 */
export function SwipeActions({ swipeRight, swipeLeft, children }: SwipeActionsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const touchscreen = useTouchscreen();
  const showSwipeRight = touchscreen && swipeRight !== undefined;
  const showSwipeLeft = touchscreen && swipeLeft !== undefined;
  const contentIndex = showSwipeRight ? 1 : 0;

  const touchingRef = useRef(false);
  // Armed from a touch until it settles, so scrolling done by code never triggers an action
  const armedRef = useRef(false);
  const triggeredRef = useRef(false);
  const lastScrollLeftRef = useRef(0);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) {
      scroller.scrollLeft = contentIndex * scroller.clientWidth;
      lastScrollLeftRef.current = scroller.scrollLeft;
    }
  }, [contentIndex]);

  const trigger = async (scroller: HTMLDivElement, action: SwipeAction | undefined) => {
    if (!action || !armedRef.current || triggeredRef.current) {
      return;
    }
    triggeredRef.current = true;
    const result = action.onTrigger();
    if (result) {
      await result;
      scroller.scrollTo({ left: contentIndex * scroller.clientWidth, behavior: "smooth" });
    }
  };

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const scroller = event.currentTarget;
    const delta = scroller.scrollLeft - lastScrollLeftRef.current;
    lastScrollLeftRef.current = scroller.scrollLeft;
    if (touchingRef.current) {
      return;
    }

    // After release the snap only moves toward its target, so trigger without waiting for it
    const offset = scroller.scrollLeft - contentIndex * scroller.clientWidth;
    const pastHalfway = Math.abs(offset) >= scroller.clientWidth / 2;
    if (pastHalfway && offset < 0 && delta < 0) {
      void trigger(scroller, swipeRight);
    } else if (pastHalfway && offset > 0 && delta > 0) {
      void trigger(scroller, swipeLeft);
    }
  };

  const handleScrollEnd = (event: UIEvent<HTMLDivElement>) => {
    const scroller = event.currentTarget;
    const index = Math.round(scroller.scrollLeft / scroller.clientWidth);
    void trigger(
      scroller,
      index < contentIndex ? swipeRight : index > contentIndex ? swipeLeft : undefined,
    );
    if (!touchingRef.current) {
      armedRef.current = false;
    }
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    touchingRef.current = false;
    const scroller = event.currentTarget;
    // A tap never scrolls, so no scrollend will disarm it
    if (Math.abs(scroller.scrollLeft - contentIndex * scroller.clientWidth) <= 1) {
      armedRef.current = false;
    }
  };

  return (
    <div
      ref={scrollerRef}
      className={classes.scroller}
      data-scroll-restoration="off"
      onTouchStart={() => {
        touchingRef.current = true;
        armedRef.current = true;
        triggeredRef.current = false;
      }}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onScroll={handleScroll}
      onScrollEnd={handleScrollEnd}
    >
      {showSwipeRight && <ActionArea action={swipeRight} side="start" />}
      <div className={classes.content}>{children}</div>
      {showSwipeLeft && <ActionArea action={swipeLeft} side="end" />}
    </div>
  );
}

function ActionArea({ action, side }: { action: SwipeAction; side: "start" | "end" }) {
  return (
    <div
      className={classes.action}
      data-side={side}
      style={{ backgroundColor: `var(--mantine-color-${action.color}-filled)` }}
      aria-hidden
    >
      {action.icon}
      {action.label}
    </div>
  );
}
