import { Anchor, type AnchorProps } from "@mantine/core";
import { createLink } from "@tanstack/react-router";
import { forwardRef } from "react";

export const MantineLink = createLink(
  forwardRef<HTMLAnchorElement, Omit<AnchorProps, "href">>((props, ref) => (
    <Anchor ref={ref} {...props} />
  )),
);
