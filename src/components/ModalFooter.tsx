import type { ReactNode } from "react";
import { Group } from "@mantine/core";
import classes from "./ModalFooter.module.css";

interface ModalFooterProps {
  children: ReactNode;
}

/** A button row pinned to the bottom of a modal's scroll area. */
export function ModalFooter({ children }: ModalFooterProps) {
  return <Group className={classes.footer}>{children}</Group>;
}
