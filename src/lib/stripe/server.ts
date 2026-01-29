import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY not configured');
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  : null;

export const STRIPE_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    events: 1000,
    features: [
      '1,000 events/month',
      '1 connected platform',
      'PHI detection & scrubbing',
      'Basic audit log',
      'Email support',
    ],
    priceId: null,
  },
  pro: {
    name: 'Pro',
    price: 99,
    events: 100000,
    features: [
      '100,000 events/month',
      'Unlimited platforms',
      'PHI detection & scrubbing',
      'Full audit log with export',
      'Priority email support',
      'Custom event mapping',
    ],
    priceId: process.env.STRIPE_PRO_PRICE_ID || null,
  },
  enterprise: {
    name: 'Enterprise',
    price: null, // Custom pricing
    events: -1, // Unlimited
    features: [
      'Unlimited events',
      'Unlimited platforms',
      'PHI detection & scrubbing',
      'Full audit log with export',
      'Dedicated support',
      'Custom integrations',
      'BAA agreement',
      'On-premise option',
    ],
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || null,
  },
} as const;

export type PlanType = keyof typeof STRIPE_PLANS;
