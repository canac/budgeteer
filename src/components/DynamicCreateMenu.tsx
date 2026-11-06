import { ActionIcon } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { lazy, Suspense, useState } from "react";
import type { CreateMenuProps } from "~/components/CreateMenu";
import { preloadTransactionModal } from "~/components/DynamicTransactionModal";
import { preloadTransferModal } from "~/components/DynamicTransferModal";
import { preloadOnHover } from "~/lib/preloadOnHover";

const CreateMenu = lazy(() =>
  import("~/components/CreateMenu").then(({ CreateMenu }) => ({
    default: CreateMenu,
  })),
);

export type DynamicCreateMenuProps = Pick<CreateMenuProps, "onNewTransaction" | "onNewTransfer">;

export function DynamicCreateMenu(props: DynamicCreateMenuProps) {
  const [requested, setRequested] = useState(false);
  const [clicked, setClicked] = useState(false);
  const preloadModals = preloadOnHover([preloadTransactionModal, preloadTransferModal]);

  const target = (
    <ActionIcon
      variant="subtle"
      color="white"
      size="xl"
      aria-label="Create"
      onFocus={preloadModals.onFocus}
      // Don't load the menu on focus because swapping in the loaded button drops focus
      onPointerEnter={() => {
        setRequested(true);
        preloadModals.onPointerEnter();
      }}
      onClick={() => {
        setRequested(true);
        setClicked(true);
      }}
    >
      <IconPlus />
    </ActionIcon>
  );

  if (!requested) {
    return target;
  }

  return (
    <Suspense fallback={target}>
      <CreateMenu {...props} target={target} defaultOpened={clicked} />
    </Suspense>
  );
}
