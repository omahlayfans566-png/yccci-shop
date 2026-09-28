import { Router, type Request, type Response } from 'express';
import {
  initializePayment,
  verifyPayment,
  paymentStatus,
  paystackWebhook,
} from '../controllers/paystackController';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/paystack/webhook
//
// Paystack calls this server-to-server after payment events.
// Raw body bytes are captured by the global express.json() verify callback
// in app.ts and attached to req.rawBody before this handler runs.
// Signature verification happens inside the controller.
// ---------------------------------------------------------------------------
router.post('/webhook', paystackWebhook);

// ---------------------------------------------------------------------------
// POST /api/paystack/initialize
// Body: { orderNumber: string, email: string }
// Returns: { authorizationUrl, accessCode, reference }
// ---------------------------------------------------------------------------
router.post('/initialize', initializePayment);

// ---------------------------------------------------------------------------
// GET /api/paystack/verify/:reference
// Called by the frontend after the customer returns from Paystack checkout.
// Makes a live call to Paystack API to confirm the transaction.
// ---------------------------------------------------------------------------
router.get('/verify/:reference', verifyPayment);

// ---------------------------------------------------------------------------
// GET /api/paystack/status/:reference
// Lightweight local-only status check (no Paystack API call).
// Frontend can poll this to see if the webhook already activated the order.
// ---------------------------------------------------------------------------
router.get('/status/:reference', paymentStatus);

// ---------------------------------------------------------------------------
// GET /api/paystack/health
// Confirms the route is reachable. Safe to call; does not verify signatures.
// ---------------------------------------------------------------------------
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'Paystack payment gateway',
    webhookEndpoint: 'POST /api/paystack/webhook',
    time: new Date().toISOString(),
  });
});

export default router;
