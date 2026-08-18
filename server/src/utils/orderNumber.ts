/**
 * Order number generation.
 *
 * Format: SHOP-YYYY-NNNNN
 * Example: SHOP-2026-00001
 */
export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();

  // Reuse the same count so every number is unique, even after deletions.
  const counterModel = await import('../models/OrderCounter').then((m) => m.OrderCounter);
  const doc = await counterModel.findOneAndUpdate(
    { key: year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `SHOP-${year}-${String(doc.seq).padStart(5, '0')}`;
}