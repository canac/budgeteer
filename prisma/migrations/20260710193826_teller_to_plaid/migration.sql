-- Teller -> Plaid rename migration

-- Tables ---------------------------------------------------------------------
ALTER TABLE "TellerEnrollment"  RENAME TO "ExternalConnection";
ALTER TABLE "TellerAccount"     RENAME TO "ExternalAccount";
ALTER TABLE "TellerTransaction" RENAME TO "ExternalTransaction";

-- Primary-key constraints ----
ALTER TABLE "ExternalConnection"  RENAME CONSTRAINT "TellerEnrollment_pkey"  TO "ExternalConnection_pkey";
ALTER TABLE "ExternalAccount"     RENAME CONSTRAINT "TellerAccount_pkey"     TO "ExternalAccount_pkey";
ALTER TABLE "ExternalTransaction" RENAME CONSTRAINT "TellerTransaction_pkey" TO "ExternalTransaction_pkey";

-- ExternalConnection: new columns ----------------------------------------------
-- institution is NOT NULL in the schema; existing (stale Teller) rows get ''.
-- New Plaid connections set it explicitly. cursor + lastSyncedAt move here
-- because Plaid sync is per-Item (per connection), not per account.
ALTER TABLE "ExternalConnection" ADD COLUMN "institution"   TEXT NOT NULL DEFAULT '';
ALTER TABLE "ExternalConnection" ADD COLUMN "cursor"        TEXT;
ALTER TABLE "ExternalConnection" ADD COLUMN "lastSyncedAt"  TIMESTAMP(3);
ALTER TABLE "ExternalConnection" ADD COLUMN "loginRequired" BOOLEAN NOT NULL DEFAULT false;

-- ExternalAccount: rename FK column, drop per-account sync timestamp -----------
ALTER TABLE "ExternalAccount" RENAME COLUMN "enrollmentId" TO "connectionId";
ALTER TABLE "ExternalAccount" DROP COLUMN "lastSyncedAt";
ALTER TABLE "ExternalAccount"
  RENAME CONSTRAINT "TellerAccount_enrollmentId_fkey" TO "ExternalAccount_connectionId_fkey";

-- ExternalTransaction: re-review flag + FK rename ------------------------------
ALTER TABLE "ExternalTransaction" ADD COLUMN "changedAt" TIMESTAMP(3);
ALTER TABLE "ExternalTransaction"
  RENAME CONSTRAINT "TellerTransaction_accountId_fkey" TO "ExternalTransaction_accountId_fkey";

-- Transaction.tellerId -> externalId -------------------------------------------
ALTER TABLE "Transaction" RENAME COLUMN "tellerId" TO "externalId";
ALTER INDEX "Transaction_tellerId_key" RENAME TO "Transaction_externalId_key";
ALTER TABLE "Transaction" RENAME CONSTRAINT "Transaction_tellerId_fkey" TO "Transaction_externalId_fkey";

-- CategorizationRule.tellerVendor -> externalVendor ----------------------------
ALTER TABLE "CategorizationRule" RENAME COLUMN "tellerVendor" TO "externalVendor";
ALTER INDEX "CategorizationRule_tellerVendor_key" RENAME TO "CategorizationRule_externalVendor_key";
