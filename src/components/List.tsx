import type { ComponentProps, ReactNode } from "react";
import { Text } from "@mantine/core";
import clsx from "clsx";
import { Clickable } from "~/components/Clickable";
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
    <Clickable
      className={clsx(classes.row, onClick && classes.clickable, className)}
      onClick={onClick}
      {...props}
    >
      <div className={classes.cellTitle}>
        <Text component="span" lineClamp={1}>
          {title}
        </Text>
        {icon}
      </div>
      {value && <div className={classes.cellValue}>{value}</div>}
      {actions && <div className={classes.cellActions}>{actions}</div>}
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
    </Clickable>
  );
}
