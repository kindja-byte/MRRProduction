// netlify/functions/acculynx-sync.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // ── 1. HANDLE CORS PREFLIGHT HEADERS ──
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: 'ok' };
  }

  // Initialize secure database clients using hidden system process variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ── 2. INBOUND SYNC: ACCULYNX WEBHOOK DISPATCHING DATA TO US ──
    if (event.httpMethod === 'POST') {
      const payload = JSON.parse(event.body);
      
      // Look for standard AccuLynx job or purchase order details
      const { jobId, orderNumber, items, customerName } = payload;

      if (!jobId) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing AccuLynx Job ID reference code.' }) };
      }

      // Format a clean layout record to map right into your existing jobs table schema
      const stagedJob = {
        id: 'j_al_' + jobId,
        name: customerName || `AccuLynx Job #${jobId}`,
        po: orderNumber ? `PO-${orderNumber}` : 'AL-SYNC',
        status: 'approved', // Automatically move incoming synchronized workflows to approved status
        newForAssigned: true,
        items: items || []
      };

      // Upsert the data record directly into your Supabase database table index
      const { error: dbError } = await supabase
        .from('jobs')
        .upsert([stagedJob], { onConflict: 'id' });

      if (dbError) throw dbError;

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: 'AccuLynx job record locked into warehouse tracking pipeline cleanly!' }),
      };
    }

    // ── 3. OUTBOUND SYNC: FRONTEND FETCHING FRESH ORDER COPIES VIA GET ──
    if (event.httpMethod === 'GET') {
      const { apiKey, targetEndpoint } = event.queryStringParameters;

      if (!apiKey) {
        return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized: API sync key required.' }) };
      }

      // Safe route proxy directly onward to AccuLynx's protected live endpoint servers
      const acculynxResponse = await fetch(`https://api.acculynx.com/v1/${targetEndpoint || 'orders/approved'}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      const data = await acculynxResponse.json();
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(data)
      };
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};