import { ActionIcon } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { DynamicTransactionModal } from "~/components/DynamicTransactionModal";

export interface AddTransactionButtonProps {
  initialCategoryId?: string;
}

export function AddTransactionButton({ initialCategoryId }: AddTransactionButtonProps) {
  const router = useRouter();
  const [transactionModalOpen, { open, close }] = useDisclosure(false);

  const handleSave = async () => {
    await router.invalidate();
  };

  return (
    <>
      <ActionIcon variant="subtle" onClick={open} title="Add Transaction">
        <IconPlus size={16} />
      </ActionIcon>
      {transactionModalOpen && (
        <DynamicTransactionModal
          onClose={close}
          onSave={handleSave}
          initialCategoryId={initialCategoryId}
        />
      )}
    </>
  );
}
