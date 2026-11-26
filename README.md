# Little Blessing site

Static page plus two small Netlify functions:

- `netlify/functions/config.js` gives the page the Stripe publishable key.
- `netlify/functions/create-intent.js` creates the $1 payment and saves the address, phone, email, both Hebrew names, the baby's birth date and boy/girl on the payment (Stripe Dashboard > Payments > open a payment > Metadata).

Checkout runs on the page: Apple Pay, Google Pay and Link through Stripe's Express Checkout, plus a card form. Delivery is limited to NY, NJ and CT, and the server checks this as well.

## Settings on Netlify (Site configuration > Environment variables)

- `STRIPE_SECRET_KEY` = sk_live_... (secret, never put it in the page)
- `STRIPE_PUBLISHABLE_KEY` = pk_live_...

## Stripe

Settings > Payment methods > Payment method domains: add the Netlify domain (for example little-blessing.netlify.app). That turns on Apple Pay and Google Pay there. The Apple Pay check file is already served by netlify.toml.

If the functions are not set up, the page falls back to the Stripe payment link.
