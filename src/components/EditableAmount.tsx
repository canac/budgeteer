import clsx from "clsx";
import { useState } from "react";
import { dollarsToPennies, penniesToDollars } from "~/lib/currencyConversion";
import { formatCurrency } from "~/lib/formatters";
import "./EditableAmount.css";

interface EditableAmountProps {
  className?: string;
  amount: number;
  saveAmount: (newAmount: number) => Promise<void>;
  editable?: boolean;
}

export function EditableAmount({
  className,
  amount,
  saveAmount,
  editable = true,
}: EditableAmountProps) {
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
      {editing && editable ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <input
            className={clsx("input", className)}
            ref={(input) => input?.focus()}
            inputMode="numeric"
            pattern="-?[0-9]*(\.[0-9]{0,2})?"
            min={0}
            aria-label="Edit amount"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onBlur={handleSave}
          />
        </form>
      ) : (
        <button
          type="button"
          className={clsx("text", className)}
          aria-label="Edit amount"
          onClick={handleEditClick}
        >
          {formatCurrency(amount)}
        </button>
      )}
    </span>
  );
}
