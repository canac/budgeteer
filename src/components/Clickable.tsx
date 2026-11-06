import type { ComponentProps, KeyboardEvent, MouseEvent } from "react";
import clsx from "clsx";
import classes from "./Clickable.module.css";

function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    event.currentTarget.click();
  }
}

/** A div that acts as a button when `onClick` is set. Clicks on nested links, buttons, and inputs are ignored. */
export function Clickable({ onClick, ...props }: ComponentProps<"div">) {
  if (!onClick) {
    return <div {...props} />;
  }

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const control = event.target instanceof Element && event.target.closest("a, button, input");
    if (!control) {
      onClick(event);
    }
  };

  return (
    <div
      {...props}
      className={clsx(classes.root, props.className)}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    />
  );
}
