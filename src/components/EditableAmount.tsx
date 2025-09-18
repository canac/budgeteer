import { Text, TextInput } from "@mantine/core";
import { useState } from "react";
import { formatCurrency } from "~/lib/formatCurrency";
import "./EditableAmount.css";

interface EditableAmountProps {
  amount: number;
  saveAmount: (newAmount: number) => Promise<void>;
}

export function EditableAmount({ amount, saveAmount }: EditableAmountProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(amount.toString());

  const handleEditClick = () => {
    setValue(amount.toString());
    setEditing(true);
  };

  const handleSave = async () => {
    await saveAmount(Number(value));
    setEditing(false);
  };

  if (editing) {
    return (
      <TextInput
        className="EditableAmount"
        classNames={{ input: "input" }}
        ref={(input) => input?.focus()}
        type="number"
        aria-label="Edit amount"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={handleSave}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            handleSave();
          }
        }}
        min={0}
        leftSection="$"
      />
    );
  }

  return (
    <Text component="span" className="text" onClick={handleEditClick}>
      {formatCurrency(amount)}
    </Text>
  );
}
