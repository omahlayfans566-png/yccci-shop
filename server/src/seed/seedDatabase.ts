import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db';
import { Admin } from '../models/Admin';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { PaymentSettings, ensurePaymentSettings } from '../models/PaymentSettings';
import { env } from '../config/env';
import { writeProductImage, slugify } from './imageUtils';

interface SeedProduct {
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  category: string;
  sizes: string[];
  colours: Array<{ name: string; hex: string }>;
  stock: number;
  status: 'AVAILABLE' | 'SOLD_OUT' | 'COMING_SOON';
  sortOrder: number;
}

const SEED_DATA: Array<{ category: string; sortOrder: number; products: SeedProduct[] }> = [
  {
    category: 'Polos',
    sortOrder: 1,
    products: [
      {
        name: 'Classic Pique Polo',
        shortDescription: 'Everyday cotton pique polo in a relaxed fit.',
        description:
          'A wardrobe staple. Made from soft cotton pique with a ribbed collar, two-button placket and a clean, tailored fit that holds its shape wash after wash.',
        price: 12000,
        category: 'Polos',
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        colours: [
          { name: 'Navy Blue', hex: '#1a237e' },
          { name: 'White', hex: '#f5f5f5' },
          { name: 'Burgundy', hex: '#7b1f1f' },
        ],
        stock: 40,
        status: 'AVAILABLE',
        sortOrder: 1,
      },
      {
        name: 'Sport Stripe Polo',
        shortDescription: 'Athletic polo with contrast-forward stripes.',
        description:
          'Performance polo with moisture-wicking fabric and striped collar detailing. Ideal for both golf range and weekend casual.',
        price: 13500,
        category: 'Polos',
        sizes: ['M', 'L', 'XL'],
        colours: [
          { name: 'Forest Green', hex: '#1b4d2b' },
          { name: 'Black', hex: '#212121' },
        ],
        stock: 25,
        status: 'AVAILABLE',
        sortOrder: 2,
      },
    ],
  },
  {
    category: 'T-Shirts',
    sortOrder: 2,
    products: [
      {
        name: 'Essential Crew Tee',
        shortDescription: 'Heavyweight 100% cotton crew-neck t-shirt.',
        description: 'A wardrobe essential cut from 100% combed cotton. Pre-shrunk with a classic crew neck.',
        price: 8500,
        category: 'T-Shirts',
        sizes: ['S', 'M', 'L', 'XL'],
        colours: [
          { name: 'Black', hex: '#212121' },
          { name: 'White', hex: '#fafafa' },
          { name: 'Grey', hex: '#9e9e9e' },
        ],
        stock: 60,
        status: 'AVAILABLE',
        sortOrder: 1,
      },
      {
        name: 'Oversized Graphic Tee',
        shortDescription: 'Street-style oversized fit with front print.',
        description: 'Drop-shoulder oversized tee with a soft-hand-feel print. Street-ready out of the box.',
        price: 9500,
        category: 'T-Shirts',
        sizes: ['M', 'L', 'XL', 'XXL'],
        colours: [{ name: 'Charcoal', hex: '#37474f' }],
        stock: 0,
        status: 'SOLD_OUT',
        sortOrder: 2,
      },
      {
        name: 'Premium Drop-Shoulder Tee',
        shortDescription: 'Slim drop-shoulder for a modern silhouette.',
        description: 'Premium blended cotton with a soft matte finish and clean ribbed neckline.',
        price: 9900,
        category: 'T-Shirts',
        sizes: ['S', 'M', 'L', 'XL'],
        colours: [
          { name: 'Ivory', hex: '#fff8e7' },
          { name: 'Stone', hex: '#bdb6a1' },
        ],
        stock: 0,
        status: 'COMING_SOON',
        sortOrder: 4,
      },
    ],
  },
  {
    category: 'Shirts',
    sortOrder: 3,
    products: [
      {
        name: 'Oxford Button-Down Shirt',
        shortDescription: 'Crisp button-down collar in durable oxford cloth.',
        description: 'A versatile button-down woven from brushed oxford fabric. Pairs equally well with tailored trousers or denim.',
        price: 16500,
        category: 'Shirts',
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        colours: [
          { name: 'Light Blue', hex: '#b3c6e7' },
          { name: 'White', hex: '#ffffff' },
          { name: 'Pink', hex: '#e8c0c0' },
        ],
        stock: 30,
        status: 'AVAILABLE',
        sortOrder: 1,
      },
      {
        name: 'Linen Resort Shirt',
        shortDescription: 'Breathable linen-blend shirt for warm days.',
        description: 'Linen-cotton blend resort shirt with a relaxed camp collar and straight hem.',
        price: 17800,
        category: 'Shirts',
        sizes: ['M', 'L', 'XL'],
        colours: [
          { name: 'Sand', hex: '#d7cbb2' },
          { name: 'Sage', hex: '#9caf88' },
        ],
        stock: 18,
        status: 'AVAILABLE',
        sortOrder: 2,
      },
    ],
  },
  {
    category: 'Caps',
    sortOrder: 4,
    products: [
      {
        name: 'Classic Structured Cap',
        shortDescription: 'Six-panel cap with adjustable strap.',
        description: 'Structured six-panel cap with a pre-curved brim and adjustable snap-back closure.',
        price: 6500,
        category: 'Caps',
        sizes: [],
        colours: [
          { name: 'Black', hex: '#212121' },
          { name: 'Khaki', hex: '#b5a789' },
        ],
        stock: 45,
        status: 'AVAILABLE',
        sortOrder: 1,
      },
      {
        name: 'Trucker Mesh Cap',
        shortDescription: 'Breathable mesh back cap with snap closure.',
        description: 'Classic trucker cap with a breathable mesh back and foam front.',
        price: 7000,
        category: 'Caps',
        sizes: [],
        colours: [{ name: 'Navy', hex: '#1a237e' }],
        stock: 20,
        status: 'AVAILABLE',
        sortOrder: 2,
      },
    ],
  },
  {
    category: 'Other',
    sortOrder: 5,
    products: [
      {
        name: 'Canvas Tote Bag',
        shortDescription: 'Heavy canvas tote with a spacious interior.',
        description: 'Durable 12oz canvas tote perfect for everyday carry.',
        price: 5200,
        category: 'Other',
        sizes: [],
        colours: [{ name: 'Natural', hex: '#e4d7bd' }],
        stock: 35,
        status: 'AVAILABLE',
        sortOrder: 1,
      },
    ],
  },
];

/**
 * Ensures the default shop categories exist and are active.
 * Creates any missing category and re-activates soft-deleted (isActive: false)
 * default categories so they appear in the shop filter and admin dropdowns.
 * This function never seeds products.
 */
async function ensureDefaultCategories(): Promise<void> {
  for (const group of SEED_DATA) {
    const existing = await Category.findOne({ name: group.category }).lean();
    if (!existing) {
      await Category.create({
        name: group.category,
        slug: slugify(group.category),
        sortOrder: group.sortOrder,
        isActive: true,
      });
      console.log(`[seed] created category → ${group.category}`);
    } else if (existing.isActive === false) {
      // Soft-deleted (deactivated in the admin Categories page). Restore the default
      // so the product form's Category dropdown is populated again.
      await Category.updateOne(
        { _id: existing._id },
        {
          isActive: true,
          slug: slugify(group.category),
          sortOrder: group.sortOrder,
        }
      );
      console.log(`[seed] re-activated category → ${group.category}`);
    }
  }
  const activeCount = await Category.countDocuments({ isActive: true });
  console.log(`[seed] active categories → ${activeCount}`);
}

/** Seeds only the default shop categories (no products). Safe to run anytime — never duplicates. */
export async function seedCategories(): Promise<void> {
  await connectDB();
  await ensureDefaultCategories();
}

export async function runSeedDatabase() {
  await connectDB();
  await ensurePaymentSettings();

  // Admin from env
  const adminEmail = env.adminInitial.email.toLowerCase();
  const adminExists = await Admin.findOne({ email: adminEmail }).lean();
  if (!adminExists) {
    const passwordHash = await bcrypt.hash(env.adminInitial.password, 10);
    await Admin.create({
      name: env.adminInitial.name,
      email: adminEmail,
      passwordHash,
      role: 'superadmin',
    });
    console.log(`[seed] admin created → ${adminEmail}`);
  }

  // Payment settings placeholders (can be edited later by an admin)
  await PaymentSettings.updateOne(
    { key: 'default' },
    {
      $setOnInsert: {
        bankName: 'Your Bank',
        accountName: 'SHOP Business Account',
        accountNumber: '0000000000',
        instructions: 'Transfer the total amount to the account above, then upload your receipt below.',
      },
    },
    { upsert: true }
  );

  // Ensure default shop categories exist (creates/re-activates them only — no products).
  await ensureDefaultCategories();

  for (const group of SEED_DATA) {
    let category = await Category.findOne({ name: group.category }).lean();
    if (!category) {
      category = await Category.findOne({ slug: slugify(group.category) }).lean();
    }
    if (!category) continue;

    for (const p of group.products) {
      const exists = await Product.findOne({ name: p.name }).lean();
      if (exists) continue;

      const images = p.colours.map((c) => writeProductImage(p.name, c.hex, `${slugify(p.name)}-${slugify(c.name)}`));
      await Product.create({
        ...p,
        category: category._id,
        mainImage: images[0],
        images,
        description: p.description + '\n\nFree delivery within Lagos. Other states: dispatch in 24–48 hours after payment confirmation.',
      });
      console.log(`[seed] created product → ${p.name}`);
    }
  }

  console.log('[seed] Done. Start the API with `npm run dev` and open the client.');
}