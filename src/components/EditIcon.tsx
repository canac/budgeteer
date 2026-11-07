import { type Icon, IconPencil } from "@tabler/icons-react";
import classes from "./EditIcon.module.css";

interface EditIconProps {
  /** Defaults to `IconPencil`. */
  icon?: Icon;
  /** Defaults to the surrounding font size. */
  size?: number | string;
}

/** An icon that fades in while its closest button is hovered or focused, hinting that it's editable. */
export function EditIcon({ icon: IconComponent = IconPencil, size = "1em" }: EditIconProps) {
  const style: Record<string, string> = {
    "--icon-size": typeof size === "number" ? `${size}px` : size,
  };

  return (
    <IconComponent
      className={classes.icon}
      style={style}
      stroke={1.5}
      // Keeps the icon full size and pinned right while its width grows, so it slides in
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden
    />
  );
}
