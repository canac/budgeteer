import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { format } from "date-fns";
import { useState } from "react";
import { createTransaction } from "~/functions/createTransaction";
import { formatCurrency } from "~/lib/formatCurrency";

interface Category {
  id: number;
  name: string;
  currentBalance: number;
}

interface NewTransactionModalProps {
  opened: boolean;
  onClose: () => void;
  categories: Category[];
  onTransactionCreated: () => void;
}

export function NewTransactionModal({
  opened,
  onClose,
  categories,
  onTransactionCreated,
}: NewTransactionModalProps) {
  const [amount, setAmount] = useState(0);
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Build category options with current balance display
  const categoryOptions = categories.map((category) => ({
    value: category.id.toString(),
    label: `${category.name} (${formatCurrency(category.currentBalance)})`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !vendor || !date || !categoryId) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createTransaction({
        data: {
          amount: Number(amount),
          vendor,
          description: description || undefined,
          date: new Date(date).toISOString(),
          categoryId: Number(categoryId),
        },
      });

      // Reset form
      setIsSubmitting(false);

      // Close modal and refresh data
      onClose();
      onTransactionCreated();
    } catch (error) {
      console.error("Failed to create transaction:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="New Transaction"
      size="md"
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <NumberInput
            label="Amount"
            leftSection="$"
            value={amount}
            onChange={(amount) =>
              setAmount(typeof amount === "string" ? 0 : amount)
            }
            required
            decimalScale={2}
          />
          <TextInput
            label="Vendor"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            required
          />
          <TextInput
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextInput
            type="date"
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Select
            label="Category"
            data={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
            required
            searchable
          />
          <Group justify="flex-end">
            <Button type="submit" loading={isSubmitting}>
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
