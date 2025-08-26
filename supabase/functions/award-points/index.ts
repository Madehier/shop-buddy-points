import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { customer_id, amount, description, scan_uuid } = await req.json()

    console.log('Award points request:', { customer_id, amount, description, scan_uuid })

    // Validate input
    if (!customer_id || !amount || !description || !scan_uuid) {
      throw new Error('Missing required parameters')
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0')
    }

    // Check if scan_uuid already exists to prevent double scanning
    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('id')
      .eq('scan_uuid', scan_uuid)
      .single()

    if (existingTransaction) {
      throw new Error('This scan has already been processed')
    }

    // Get current points per euro ratio from settings
    const { data: settingData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'points_per_euro')
      .single()

    const pointsPerEuro = parseFloat(settingData?.value || '1.0')
    const pointsToAward = Math.floor(amount * pointsPerEuro)

    console.log('Points calculation:', { amount, pointsPerEuro, pointsToAward })

    // Get customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single()

    if (customerError || !customer) {
      throw new Error('Customer not found')
    }

    // Create transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert([{
        customer_id,
        type: 'purchase',
        points_earned: pointsToAward,
        amount,
        description,
        scan_uuid
      }])

    if (transactionError) {
      console.error('Transaction error:', transactionError)
      throw new Error('Failed to create transaction')
    }

    // Update customer points
    const newPoints = customer.points + pointsToAward
    const newTotalPoints = customer.total_points + pointsToAward

    const { error: customerUpdateError } = await supabase
      .from('customers')
      .update({
        points: newPoints,
        total_points: newTotalPoints,
        updated_at: new Date().toISOString()
      })
      .eq('id', customer_id)

    if (customerUpdateError) {
      console.error('Customer update error:', customerUpdateError)
      throw new Error('Failed to update customer points')
    }

    // Check and award badges
    await supabase.rpc('check_and_award_badges', { customer_uuid: customer_id })

    console.log('Points awarded successfully:', { customer_id, pointsToAward, newPoints, newTotalPoints })

    return new Response(
      JSON.stringify({
        success: true,
        points_awarded: pointsToAward,
        new_points_balance: newPoints,
        new_total_points: newTotalPoints,
        customer_name: customer.name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in award-points function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})