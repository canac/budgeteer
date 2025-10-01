import { ActionIcon, type ActionIconProps, Anchor, type AnchorProps } from "@mantine/core";
import { createLink } from "@tanstack/react-router";
import { forwardRef } from "react";

export const MantineActionIconLink = createLink(
  forwardRef<HTMLAnchorElement, ActionIconProps & AnchorProps>((props, ref) => (
    <ActionIcon component={Anchor} ref={ref} {...props} />
  )),
);
