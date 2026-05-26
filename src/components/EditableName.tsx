import { useState } from "react";
import "./EditableName.css";

interface EditableNameProps {
  name: string;
  saveName: (newName: string) => Promise<void>;
}

export function EditableName({ name, saveName }: EditableNameProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  const handleEditClick = () => {
    setValue(name);
    setEditing(true);
  };

  const handleSave = async () => {
    await saveName(value);
    setEditing(false);
  };

  return (
    <span className="EditableName">
      {editing ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await handleSave();
          }}
        >
          <input
            className="input"
            ref={(input) => input?.focus()}
            type="text"
            aria-label="Edit name"
            data-mantine-stop-propagation="true"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setEditing(false);
              }
            }}
            onBlur={handleSave}
          />
        </form>
      ) : (
        <button type="button" className="text" aria-label="Edit name" onClick={handleEditClick}>
          {name}
        </button>
      )}
    </span>
  );
}
