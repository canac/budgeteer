import type { ReactNode } from "react";
import { Text } from "@mantine/core";
import clsx from "clsx";
import "./List.css";

interface ListProps {
  children: ReactNode;
  className?: string;
}

/** Vertical list of rows, laid out for narrow screens. */
export function List({ children, className }: ListProps) {
  return <div className={clsx("List", className)}>{children}</div>;
}

export interface ListRowProps {
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

export function ListRow({ icon, title, value, actions, meta, tags, className }: ListRowProps) {
  const hasBottom = Boolean(meta) || Boolean(tags);

  return (
    <div className={clsx("list-row", className)}>
      <div className="cell-title">
        <Text component="span" lineClamp={1}>
          {title}
        </Text>
        {icon}
      </div>
      {value && <div className="cell-value">{value}</div>}
      <div className="cell-actions">{actions}</div>
      {hasBottom && (
        <div className="cell-bottom">
          {meta && (
            <Text component="span" className="row-meta" c="dimmed" size="sm">
              {meta}
            </Text>
          )}
          {tags}
        </div>
      )}
    </div>
  );
}
