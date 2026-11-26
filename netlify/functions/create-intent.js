// Creates the $1 PaymentIntent and stores every detail of the request on it, so each
// order in the Stripe Dashboard carries the address, phone, Hebrew names and birth date.
const STATES = ['NY', 'NJ', 'CT'];
const clean = (v, n = 120) => String(v == null ? '' : v).trim().slice(0, n);

function form(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') form(v, key, out);
    else out.push(encodeURIComponent(key) + '=' + encodeURIComponent(v));
  }
  return out.join('&');
}

const reply = (code, body) => ({ statusCode: code, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reply(405, { error: 'POST only' });
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) return reply(503, { error: 'Payments are not set up yet.' });
  let d;
  try { d = JSON.parse(event.body || '{}'); } catch (e) { return reply(400, { error: 'Bad request' }); }

  const baby = d.baby === 'boy' ? 'boy' : 'girl';
  const hebMother = clean(d.hebMother, 80), hebBaby = clean(d.hebBaby, 80), dob = clean(d.dob, 10);
  const email = clean(d.email, 200), phone = clean(d.phone, 40);
  const s = d.shipping || {}, a = s.address || {};
  const ship = {
    name: clean(s.name, 120), phone,
    address: { line1: clean(a.line1, 200), line2: clean(a.line2, 200), city: clean(a.city, 100), state: clean(a.state, 20).toUpperCase(), postal_code: clean(a.postal_code, 12), country: 'US' },
  };

  const missing = [];
  if (!hebMother) missing.push("your Jewish name");
  if (!hebBaby) missing.push("baby's Jewish name");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) missing.push("baby's date of birth");
  if (!ship.name) missing.push('name');
  if (!phone) missing.push('phone');
  if (!ship.address.line1 || !ship.address.city || !ship.address.postal_code) missing.push('delivery address');
  if (missing.length) return reply(400, { error: 'Please add: ' + missing.join(', ') + '.' });
  if (!STATES.includes(ship.address.state)) return reply(400, { error: 'For now we deliver in New York, New Jersey and Connecticut only.' });

  const body = form({
    amount: 100, currency: 'usd',
    'automatic_payment_methods': { enabled: 'true' },
    description: `Little Blessing gift (${baby}) · letter in the Children's Sefer Torah`,
    receipt_email: email || undefined,
    // shipping is not set here: Stripe.js attaches it on confirm (from the wallet or the
    // address form), and a restricted key's shipping can't be changed by the page later.
    metadata: {
      ship_to: [ship.name, ship.address.line1, ship.address.line2, ship.address.city, ship.address.state + ' ' + ship.address.postal_code].filter(Boolean).join(', ').slice(0, 480),
      baby, baby_hebrew_name: hebBaby, mother_hebrew_name: hebMother, baby_dob: dob,
      name: ship.name, phone, email, state: ship.address.state, source: 'little-blessing-site',
    },
  });
  const r = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: Object.assign({ Authorization: 'Bearer ' + sk, 'Content-Type': 'application/x-www-form-urlencoded' }, d.key ? { 'Idempotency-Key': clean(d.key, 64) } : {}),
    body,
  });
  const j = await r.json();
  if (!r.ok) return reply(502, { error: (j.error && j.error.message) || 'Payment could not start.' });
  return reply(200, { clientSecret: j.client_secret });
};
