import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  // 1. Setup Supabase with Admin/Service Role Privileges
  // Use your SERVICE_ROLE_KEY here because this is a secure server-side action
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! 
  );

  const body = await req.json();
  const signature = req.headers.get('x-paystack-signature');
  const secret = process.env.PAYSTACK_SECRET_KEY;

  // 2. SECURITY: Verify the Paystack Signature
  const hash = crypto
    .createHmac('sha512', secret!)
    .update(JSON.stringify(body))
    .digest('hex');

  if (hash !== signature) {
    return new NextResponse('Unauthorized Signature', { status: 401 });
  }

  const event = body.event;
  const data = body.data;

  // 3. LOGIC: Handle Successful Charge
  if (event === 'charge.success') {
    // Extract the Order ID we stashed in the metadata earlier
    const orderId = data.metadata?.custom_fields?.find(
      (f: any) => f.variable_name === 'order_id'
    )?.value;

    if (orderId) {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'paid', // Or 'active'
          payment_reference: data.reference,
          last_payment_date: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('Database Update Failed:', error.message);
        return new NextResponse('Database Error', { status: 500 });
      }
      
      console.log(`✅ Vault Order ${orderId} marked as PAID.`);
    }
  }

  return new NextResponse('OK', { status: 200 });
}