import type { RequestHandler } from 'express';
import { body, validationResult } from 'express-validator';
import { HttpError } from './error';

export const validateResult: RequestHandler = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Validation failed', 422, errors.array()));
  }
  next();
};

export const orderRules = [
  body('customer.fullName')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Full name must be between 2 and 120 characters'),
  body('customer.phone')
    .trim()
    .isLength({ min: 6, max: 30 })
    .withMessage('Valid phone number required'),
  body('customer.email').isEmail().withMessage('Valid email required'),
  body('customer.address')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Delivery address required'),
  body('customer.state').trim().notEmpty().withMessage('State is required'),
  body('customer.city').trim().notEmpty().withMessage('City is required'),
  body('customer.note').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }),
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.productId').isMongoId().withMessage('Invalid product id'),
  body('items.*.name').trim().isLength({ min: 1, max: 200 }),
  body('items.*.price').isFloat({ gt: 0 }).withMessage('Invalid price'),
  body('items.*.quantity').isInt({ min: 1, max: 99 }).withMessage('Invalid quantity'),
  body('items.*.size').optional({ values: 'falsy' }).isString().isLength({ max: 30 }),
  body('items.*.colour').optional({ values: 'falsy' }).isString().isLength({ max: 60 }),
  body('paymentRef').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
];

export const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 1 }).withMessage('Password required'),
];

export const categoryRules = [
  body('name').trim().isLength({ min: 1, max: 80 }).withMessage('Category name required'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
];

export const productRules = [
  body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Product name required'),
  body('shortDescription').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 5000 }),
  body('price').isFloat({ min: 0 }).withMessage('Price must be 0 or more'),
  body('category').isMongoId().withMessage('A valid category is required'),
  body('sizes').optional({ values: 'falsy' }).isArray().withMessage('sizes must be an array'),
  body('colours').optional({ values: 'falsy' }).isArray().withMessage('colours must be an array'),
  body('stock').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('stock must be a positive integer'),
  body('status').optional().isIn(['AVAILABLE', 'SOLD_OUT', 'COMING_SOON']).withMessage('Invalid stock status'),
];

export const paymentSettingsRules = [
  body('bankName').trim().isLength({ min: 1, max: 120 }).withMessage('Bank name required'),
  body('accountName').trim().isLength({ min: 1, max: 120 }).withMessage('Account name required'),
  body('accountNumber').trim().isLength({ min: 4, max: 40 }).withMessage('Account number required'),
  body('instructions').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }),
];