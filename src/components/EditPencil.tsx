import { IconPencil } from "@tabler/icons-react";
import classes from "./EditPencil.module.css";

interface EditPencilProps {
  /** Defaults to the surrounding font size. */
  size?: number | string;
}

/** A pencil that fades in while its closest button is hovered or focused, hinting that it's editable. */
export function EditPencil({ size = "1em" }: EditPencilProps) {
  const style: Record<string, string> = {
    "--icon-size": typeof size === "number" ? `${size}px` : size,
  };

  return (
    <IconPencil
      className={classes.pencil}
      style={style}
      stroke={1.5}
      // Keeps the icon full size and pinned right while its width grows, so it slides in
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden
    />
  );
}
