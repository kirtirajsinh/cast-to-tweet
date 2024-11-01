import { Hono } from 'hono'
import { Env } from '../types'
import { postTweet } from './utils'
import CryptoJS from 'crypto-js';

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.post('/cast', async (c) => {

  // Retrieve the raw request body and signature header
  const body = await c.req.text();
  const sig = c.req.header("X-Neynar-Signature");
  console.log(sig, "sig");

  if (!sig) {
    return c.json({ error: "Neynar signature missing from request headers" }, 400);
  }

  const webhookSecret = c.env.NEYNAR_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("Make sure you set NEYNAR_WEBHOOK_SECRET in your environment variables");
  }

  // Generate HMAC signature using crypto-js
  const hmac = CryptoJS.HmacSHA512(body, webhookSecret);
  const generatedSignature = CryptoJS.enc.Hex.stringify(hmac);
  console.log(generatedSignature, "generatedSignature");

  if (generatedSignature !== sig) {
    return c.json({ error: "Invalid webhook signature" }, 403);
  }

  // Parse JSON body after verification
  const hookData = JSON.parse(body);
  console.log(hookData, "hookData");

  if (hookData?.data?.parent_hash) {
    return c.text('This is a Comment!');
  }

  if (!hookData?.data?.text) {
    return c.json({ error: "No text provided", "message": "Tweet failed!" });
  }

  try {
    const { tweetIds } = await postTweet(hookData?.data?.text, null, c.env);
    return c.json({ tweetIds, "message": "Tweeted!" });
  }
  catch (error) {
    return c.json({ error, "message": "Tweet failed!" });
  }
})

export default app
