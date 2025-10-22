import { useState } from "react";
import { dollarsToPennies, penniesToDollars } from "~/lib/currencyConversion";
import { formatCurrency } from "~/lib/formatters";
import "./EditableAmount.css";

interface EditableAmountProps {
  amount: number;
  saveAmount: (newAmount: number) => Promise<void>;
}

export function EditableAmount({ amount, saveAmount }: EditableAmountProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(penniesToDollars(amount).toString());

  const handleEditClick = () => {
    setValue(penniesToDollars(amount).toString());
    setEditing(true);
  };

  const handleSave = async () => {
    saveAmount(dollarsToPennies(Number(value))).catch(() => {});
    setEditing(false);
  };

  return (
    <span className="EditableAmount">
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
            inputMode="numeric"
            pattern="[0-9]*(\.[0-9]{0,2})?"
            min={0}
            aria-label="Edit amount"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onBlur={handleSave}
          />
        </form>
      ) : (
        <button type="button" className="text" aria-label="Edit amount" onClick={handleEditClick}>
          {formatCurrency(amount)}
        </button>
      )}
    </span>
  );
}
