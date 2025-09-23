import { ActionIcon } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowsRightLeft } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { NewTransferModal } from "~/components/NewTransferModal";

export interface AddTransferButtonProps {
  sourceCategoryId?: number;
}

export function AddTransferButton({ sourceCategoryId }: AddTransferButtonProps) {
  const router = useRouter();
  const [transferModalOpen, { open, close }] = useDisclosure(false);

  const handleSave = async () => {
    await router.invalidate();
  };

  return (
    <>
      <ActionIcon variant="subtle" onClick={open} title="Add Transfer">
        <IconArrowsRightLeft size="1rem" />
      </ActionIcon>
      {transferModalOpen && (
        <NewTransferModal onClose={close} onSave={handleSave} sourceCategoryId={sourceCategoryId} />
      )}
    </>
  );
}
