import clsx from "clsx";
import { useState } from "react";
import { dollarsToPennies, penniesToDollars } from "~/lib/currencyConversion";
import { formatCurrency } from "~/lib/formatters";
import classes from "./useEditableAmount.module.css";

interface UseEditableAmountOptions {
  amount: number;
  saveAmount: (newAmount: number) => Promise<void>;
  /** Defaults to `true`. */
  editable?: boolean;
  /** Applied to both the amount text and the input. */
  className?: string;
}

/**
 * Inline editing for an amount. Render `field`, and call `edit` from the parent's click handler.
 * `edit` is `undefined` when the amount isn't editable.
 */
export function useEditableAmount({
  amount,
  saveAmount,
  editable = true,
  className,
}: UseEditableAmountOptions) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const edit = () => {
    // Clicking the parent while editing blurs the input, which saves instead
    if (editing) {
      return;
    }
    setValue(penniesToDollars(amount).toString());
    setEditing(true);
  };

  const handleSave = async () => {
    await saveAmount(dollarsToPennies(Number(value)));
    setEditing(false);
  };

  const field = editing ? (
    <form
      className={classes.form}
      onSubmit={async (event) => {
        event.preventDefault();
        await handleSave();
      }}
    >
      <input
        className={clsx(classes.input, className)}
        ref={(input) => input?.focus()}
        inputMode="decimal"
        pattern="-?[0-9]*(\.[0-9]{0,2})?"
        aria-label="Edit amount"
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
    <span className={clsx(classes.text, className)}>{formatCurrency(amount)}</span>
  );

  return { edit: editable ? edit : undefined, field };
}
