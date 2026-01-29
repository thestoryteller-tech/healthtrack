import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, STRIPE_PLANS, type PlanType } from '@/lib/stripe/server';

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = await request.json();

    if (!planId || !(planId in STRIPE_PLANS)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const plan = STRIPE_PLANS[planId as PlanType];

    if (!plan.priceId) {
      return NextResponse.json({ error: 'Plan not available for checkout' }, { status: 400 });
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Get or create Stripe customer
    const { data: orgData } = await supabase
      .from('organizations')
      .select('stripe_customer_id, name')
      .eq('id', userData.org_id)
      .single();

    let customerId = orgData?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: orgData?.name || undefined,
        metadata: {
          org_id: userData.org_id,
          user_id: user.id,
        },
      });

      customerId = customer.id;

      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', userData.org_id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?canceled=true`,
      metadata: {
        org_id: userData.org_id,
        plan_id: planId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
