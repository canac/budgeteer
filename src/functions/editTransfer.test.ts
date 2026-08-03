import { createCategory, createTransaction } from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { editTransfer } from "./editTransfer.ts";

describe("editTransfer", () => {
  const prisma = getPrisma();

  let transferId: string;
  let transactionId: string;
  let sourceCategoryId: string;
  let destinationCategoryId: string;
  beforeEach(async () => {
    const [source, destination] = await Promise.all([createCategory(), createCategory()]);
    sourceCategoryId = source.id;
    destinationCategoryId = destination.id;

    const transaction = await createTransaction({
      type: "TRANSFER",
      amount: 0,
      date: "2025-01-31",
      vendor: "Transfer",
      description: "Original",
      transactionCategories: {
        create: [
          { categoryId: sourceCategoryId, amount: -5000 },
          { categoryId: destinationCategoryId, amount: 5000 },
        ],
      },
      transfer: {
        create: { amount: 5000, sourceCategoryId, destinationCategoryId },
      },
    });
    transactionId = transaction.id;

    const transfer = await prisma.transfer.findUniqueOrThrow({ where: { transactionId } });
    transferId = transfer.id;
  });

  it("updates the transfer amount", async () => {
    await editTransfer({ data: { id: transferId, amount: 7500 } });

    const transfer = await prisma.transfer.findUniqueOrThrow({ where: { id: transferId } });
    expect(transfer.amount).toBe(7500);
  });

  it("updates the source and destination category amounts", async () => {
    await editTransfer({ data: { id: transferId, amount: 7500 } });

    const categories = await prisma.transactionCategory.findMany({
      where: { transactionId },
      orderBy: { amount: "asc" },
    });
    expect(categories).toMatchObject([
      { categoryId: sourceCategoryId, amount: -7500 },
      { categoryId: destinationCategoryId, amount: 7500 },
    ]);
  });

  it("keeps the transaction amount at zero", async () => {
    await editTransfer({ data: { id: transferId, amount: 7500 } });

    const transaction = await prisma.transaction.findUniqueOrThrow({
      where: { id: transactionId },
    });
    expect(transaction.amount).toBe(0);
  });

  it("updates the description", async () => {
    await editTransfer({
      data: { id: transferId, amount: 5000, description: "Cover overspending" },
    });

    const transaction = await prisma.transaction.findUniqueOrThrow({
      where: { id: transactionId },
    });
    expect(transaction.description).toBe("Cover overspending");
  });

  it("clears the description when passed null", async () => {
    await editTransfer({ data: { id: transferId, amount: 5000, description: null } });

    const transaction = await prisma.transaction.findUniqueOrThrow({
      where: { id: transactionId },
    });
    expect(transaction.description).toBeNull();
  });

  it("leaves the description unchanged when omitted", async () => {
    await editTransfer({ data: { id: transferId, amount: 7500 } });

    const transaction = await prisma.transaction.findUniqueOrThrow({
      where: { id: transactionId },
    });
    expect(transaction.description).toBe("Original");
  });

  it("rejects an unknown transfer", async () => {
    await expect(editTransfer({ data: { id: "missing", amount: 5000 } })).rejects.toThrow(
      "No record was found for a query",
    );
  });
});
