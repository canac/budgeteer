import { Button, type ButtonProps } from "@mantine/core";
import { createLink } from "@tanstack/react-router";
import { forwardRef } from "react";

export const MantineButtonLink = createLink(
  forwardRef<HTMLAnchorElement, ButtonProps>((props, ref) => (
    <Button component="a" ref={ref} {...props} />
  )),
);
