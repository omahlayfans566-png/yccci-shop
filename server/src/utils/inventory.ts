import { Product } from '../models/Product';
import { Order } from '../models/Order';

export interface DeductInventoryResult {
  success: boolean;
  alreadyDeducted: boolean;
  failedItems: Array<{
    productId: string;
    name: string;
    requested: number;
    available: number;
  }>;
}

/**
 * Atomically deducts product stock for an order upon confirmed payment.
 *
 * Idempotency Guarantee:
 * Uses atomic findOneAndUpdate with condition `inventoryDeducted: { $ne: true }`
 * to ensure that concurrent or duplicate calls (e.g. webhook arriving at the exact
 * same time as the customer return verify endpoint) will execute the deduction
 * EXACTLY ONCE per order.
 *
 * Race Condition & Over-Selling Prevention:
 * Uses atomic MongoDB updates `{ _id: productId, stock: { $gte: quantity } }`
 * with `$inc: { stock: -quantity }`. Stock is NEVER decreased below 0.
 *
 * Safe Failure Recovery:
 * If an item was oversold while payment was in progress, all items in this order
 * that were successfully deducted are immediately rolled back and the order is
 * flagged with an administrative note for refund or backorder handling.
 */
export async function deductOrderInventory(orderId: string): Promise<DeductInventoryResult> {
  // 1. Atomically claim the inventory deduction for this order
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      inventoryDeducted: { $ne: true },
    },
    {
      $set: { inventoryDeducted: true },
    },
    { new: false }
  ).lean();

  // If order is null, either the order does not exist or inventory was ALREADY deducted!
  if (!order) {
    return {
      success: true,
      alreadyDeducted: true,
      failedItems: [],
    };
  }

  const items = order.items || [];
  const successfullyDeducted: Array<{ productId: string; qty: number }> = [];
  const failedItems: Array<{ productId: string; name: string; requested: number; available: number }> = [];

  for (const item of items) {
    if (!item.product) continue;
    const productId = item.product.toString();
    const qty = Number(item.quantity) || 1;

    // Atomic update: only decrement if stock is at least requested quantity
    const updated = await Product.findOneAndUpdate(
      {
        _id: productId,
        stock: { $gte: qty },
      },
      {
        $inc: { stock: -qty },
      },
      { new: true }
    ).lean();

    if (updated) {
      successfullyDeducted.push({ productId, qty });
      // If stock reaches 0, update status to SOLD_OUT if it was AVAILABLE
      if (updated.stock <= 0 && updated.status === 'AVAILABLE') {
        await Product.updateOne({ _id: productId, stock: 0 }, { status: 'SOLD_OUT' });
      }
    } else {
      // Stock was insufficient for this item
      const currentProd = await Product.findById(productId).lean();
      failedItems.push({
        productId,
        name: item.name,
        requested: qty,
        available: (currentProd?.stock as number) || 0,
      });
    }
  }

  // If any item failed to deduct (e.g. oversold while payment was pending):
  if (failedItems.length > 0) {
    // Rollback the items that were successfully deducted for this order
    for (const { productId, qty } of successfullyDeducted) {
      await Product.updateOne({ _id: productId }, { $inc: { stock: qty } });
      const current = await Product.findById(productId).lean();
      if (current && (current.stock as number) > 0 && current.status === 'SOLD_OUT') {
        await Product.updateOne({ _id: productId }, { status: 'AVAILABLE' });
      }
    }

    // Reset inventoryDeducted flag and record an alert on the order
    const failureDetails = failedItems
      .map((f) => `"${f.name}" (requested: ${f.requested}, available: ${f.available})`)
      .join(', ');

    const note = `[INSUFFICIENT STOCK UPON PAYMENT] Payment was confirmed, but inventory was unavailable for: ${failureDetails}. Requires manual fulfillment or refund.`;

    await Order.updateOne(
      { _id: orderId },
      {
        $set: {
          inventoryDeducted: false,
          adminNotes: order.adminNotes ? `${order.adminNotes}\n${note}` : note,
        },
      }
    );

    return {
      success: false,
      alreadyDeducted: false,
      failedItems,
    };
  }

  return {
    success: true,
    alreadyDeducted: false,
    failedItems: [],
  };
}

/**
 * Restores product stock for an order if it was previously deducted
 * (e.g. if an admin cancels, rejects, or refunds a verified order).
 */
export async function restoreOrderInventory(orderId: string): Promise<boolean> {
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      inventoryDeducted: true,
    },
    {
      $set: { inventoryDeducted: false },
    },
    { new: false }
  ).lean();

  if (!order) return false;

  for (const item of order.items || []) {
    if (!item.product) continue;
    const productId = item.product.toString();
    const qty = Number(item.quantity) || 1;

    await Product.updateOne({ _id: productId }, { $inc: { stock: qty } });
    const current = await Product.findById(productId).lean();
    if (current && (current.stock as number) > 0 && current.status === 'SOLD_OUT') {
      await Product.updateOne({ _id: productId }, { status: 'AVAILABLE' });
    }
  }

  return true;
}
