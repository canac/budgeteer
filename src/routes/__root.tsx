/// <reference types="vite/client" />
import mantineChartsCss from "@mantine/charts/styles.css?url";
import { mantineHtmlProps, MantineProvider } from "@mantine/core";
import mantineCss from "@mantine/core/styles.css?url";
import { Notifications } from "@mantine/notifications";
import mantineNotificationsCss from "@mantine/notifications/styles.css?url";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import globalCss from "~/global.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: "Budgeteer" },
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    links: [
      { rel: "stylesheet", href: mantineCss },
      { rel: "stylesheet", href: mantineChartsCss },
      { rel: "stylesheet", href: mantineNotificationsCss },
      { rel: "stylesheet", href: globalCss },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <HeadContent />
      </head>
      <body>
        <MantineProvider>
          <Notifications />
          <Outlet />
        </MantineProvider>
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
