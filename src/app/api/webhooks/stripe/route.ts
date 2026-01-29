import { NextRequest, NextResponse } from 'next/server';
import { stripe, type PlanType } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Use service role key for admin operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.org_id;
        const planId = session.metadata?.plan_id as PlanType;

        if (orgId && planId) {
          await supabase
            .from('organizations')
            .update({
              subscription_tier: planId,
              stripe_subscription_id: session.subscription as string,
            })
            .eq('id', orgId);

          await supabase.from('audit_log').insert({
            org_id: orgId,
            action: 'subscription_created',
            details: {
              plan: planId,
              subscription_id: session.subscription,
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find organization by customer ID
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (org) {
          // Determine plan from price
          let newPlan: PlanType = 'free';
          const priceId = subscription.items.data[0]?.price.id;

          if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
            newPlan = 'pro';
          } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
            newPlan = 'enterprise';
          }

          await supabase
            .from('organizations')
            .update({ subscription_tier: newPlan })
            .eq('id', org.id);

          await supabase.from('audit_log').insert({
            org_id: org.id,
            action: 'subscription_updated',
            details: {
              plan: newPlan,
              status: subscription.status,
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (org) {
          await supabase
            .from('organizations')
            .update({
              subscription_tier: 'free',
              stripe_subscription_id: null,
            })
            .eq('id', org.id);

          await supabase.from('audit_log').insert({
            org_id: org.id,
            action: 'subscription_canceled',
            details: {
              previous_subscription: subscription.id,
            },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (org) {
          await supabase.from('audit_log').insert({
            org_id: org.id,
            action: 'payment_failed',
            details: {
              invoice_id: invoice.id,
              amount: invoice.amount_due,
            },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
