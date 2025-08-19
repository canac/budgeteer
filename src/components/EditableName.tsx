import { useState } from "react";
import { TextInput, Text } from "@mantine/core";
import classes from "./EditableName.module.css";

interface EditableNameProps {
  name: string;
  saveName: (newName: string) => Promise<void>;
}

export function EditableName({ name, saveName }: EditableNameProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name.toString());

  const handleEditClick = () => {
    setValue(name.toString());
    setEditing(true);
  };

  const handleSave = async () => {
    await saveName(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <TextInput
        classNames={{ input: classes.input }}
        ref={(input) => input?.focus()}
        type="text"
        aria-label="Edit name"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={handleSave}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            handleSave();
          }
        }}
      />
    );
  }

  return (
    <Text className={classes.text} onClick={handleEditClick}>
      {name}
    </Text>
  );
}
