import { ActionIcon } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowsRightLeft } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { TransferModal } from "~/components/TransferModal";

export interface AddTransferButtonProps {
  sourceCategoryId?: string;
}

export function AddTransferButton({ sourceCategoryId }: AddTransferButtonProps) {
  const router = useRouter();
  const [transferModalOpen, { open, close }] = useDisclosure(false);

  const handleSave = async () => {
    await router.invalidate();
  };

  return (
    <>
      <ActionIcon variant="subtle" size="lg" onClick={open} title="Add Transfer">
        <IconArrowsRightLeft />
      </ActionIcon>
      {transferModalOpen && (
        <TransferModal onClose={close} onSave={handleSave} sourceCategoryId={sourceCategoryId} />
      )}
    </>
  );
}
