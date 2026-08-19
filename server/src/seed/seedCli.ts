import { runSeedDatabase, seedCategories } from './seedDatabase';

// `npm run seed -- --categories` seeds ONLY default categories (no products).
const onlyCategories = process.argv.includes('--categories');

(onlyCategories ? seedCategories() : runSeedDatabase())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  });