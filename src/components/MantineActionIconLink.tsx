import { ActionIcon, type ActionIconProps, Anchor } from "@mantine/core";
import { createLink } from "@tanstack/react-router";
import { forwardRef } from "react";

export const MantineActionIconLink = createLink(
  forwardRef<HTMLAnchorElement, ActionIconProps>((props, ref) => (
    <ActionIcon ref={ref} component={Anchor} {...props} />
  )),
);
