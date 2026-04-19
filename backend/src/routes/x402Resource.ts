import type { Request, Response } from "express";

// Mock resources for x402 demonstration
export const X402_RESOURCES: Record<string, { price: number; name: string }> = {
  "weather-data": { price: 1000, name: "Premium Weather Data API" },
  "market-feed": { price: 5000, name: "Live Market Feed" },
  "compute-task": { price: 50000, name: "AI Compute Task" },
};

// Target wallet for SentielAI x402 payments (matches simulation mock receiver)
const X402_MERCHANT_WALLET = "GmVvumDq2BRsQTTWjwgEBSWYN3MoFU1niSBCYBUTRCaK";

export function handleResourceRequest(req: Request, res: Response) {
  const resourceId = req.params.resourceId;
  const resource = X402_RESOURCES[resourceId];

  if (!resource) {
    return res.status(404).json({ error: "Resource not found" });
  }

  // Check for the x402 payment signature header
  const paymentSig = req.headers["x-payment-signature"];

  if (!paymentSig) {
    // Stage 1: Send the 402 Payment Required Challenge
    return res.status(402).json({
      status: "payment_required",
      message: `Access to ${resource.name} requires an x402 payment.`,
      payment_request: {
        network: "solana-devnet",
        amount: resource.price,
        token: "SOL",
        receiver: X402_MERCHANT_WALLET,
      },
    });
  }

  // Stage 2: Payment Signature provided (Simulation)
  // In a real implementation, we would verify the transaction on the Solana cluster
  // using Helius API:
  // await verifyTransaction(paymentSig, resource.price, X402_MERCHANT_WALLET);

  return res.status(200).json({
    status: "success",
    resource_id: resourceId,
    data: `Here is the highly valuable data for ${resource.name}...`,
    payment_receipt: paymentSig,
  });
}
