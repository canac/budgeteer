import { NavLink, type NavLinkProps } from "@mantine/core";
import { createLink } from "@tanstack/react-router";
import { forwardRef } from "react";

export const MantineNavLink = createLink(
  forwardRef<HTMLAnchorElement, NavLinkProps>((props, ref) => (
    <NavLink ref={ref} component="a" {...props} />
  )),
);
