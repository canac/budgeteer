import { useState } from "react";
import { TextInput, Text } from "@mantine/core";
import { formatCurrency } from "~/lib/formatCurrency";
import classes from "./EditableAmount.module.css";

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
        classNames={{ input: classes.input }}
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
    <Text className={classes.text} onClick={handleEditClick}>
      {formatCurrency(amount)}
    </Text>
  );
}
