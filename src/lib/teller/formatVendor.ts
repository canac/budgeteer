export function formatTellerVendor(vendor: string): string {
  return vendor.replace(
    /[\w']+/g,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}
