import type { ComponentProps, KeyboardEvent, ReactNode } from "react";
import { Text } from "@mantine/core";
import clsx from "clsx";
import classes from "./List.module.css";

interface ListProps {
  children: ReactNode;
  className?: string;
}

/** Vertical list of rows, laid out for narrow screens. */
export function List({ children, className }: ListProps) {
  return <div className={clsx(classes.root, className)}>{children}</div>;
}

export interface ListRowProps extends Pick<
  ComponentProps<"div">,
  "onClick" | "onPointerEnter" | "onFocus"
> {
  title: ReactNode;
  className?: string;
  /** Rendered after the title. */
  icon?: ReactNode;
  /** Aligned to the right of the title. */
  value?: ReactNode;
  /** Controls aligned to the far right of the title. */
  actions?: ReactNode;
  /** Secondary text below the title. Rendered dimmed and small. */
  meta?: ReactNode;
  /** Badges below the value. */
  tags?: ReactNode;
}

function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    event.currentTarget.click();
  }
}

export function ListRow({
  icon,
  title,
  value,
  actions,
  meta,
  tags,
  className,
  onClick,
  ...props
}: ListRowProps) {
  const hasBottom = Boolean(meta) || Boolean(tags);

  return (
    <div
      className={clsx(classes.row, onClick && classes.clickable, className)}
      {...(onClick && {
        role: "button",
        tabIndex: 0,
        onClick,
        onKeyDown: handleKeyDown,
      })}
      {...props}
    >
      <div className={classes.cellTitle}>
        <Text component="span" lineClamp={1}>
          {title}
        </Text>
        {icon}
      </div>
      {value && <div className={classes.cellValue}>{value}</div>}
      <div className={classes.cellActions}>{actions}</div>
      {hasBottom && (
        <div className={classes.cellBottom}>
          {meta && (
            <Text component="span" className={classes.rowMeta} c="dimmed" size="sm">
              {meta}
            </Text>
          )}
          {tags}
        </div>
      )}
    </div>
  );
}
