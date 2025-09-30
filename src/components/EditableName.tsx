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
    saveName(value).catch(() => {});
    setEditing(false);
  };

  return (
    <span className="EditableName">
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <input
            className="input"
            ref={(input) => input?.focus()}
            type="text"
            aria-label="Edit name"
            value={value}
            onChange={(event) => setValue(event.target.value)}
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
