// Hands the page the Stripe publishable key (safe to share) so no keys live in the HTML.
exports.handler = async () => {
  const pk = process.env.STRIPE_PUBLISHABLE_KEY || '';
  return {
    statusCode: pk ? 200 : 503,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify(pk ? { publishableKey: pk } : { error: 'not configured' }),
  };
};
