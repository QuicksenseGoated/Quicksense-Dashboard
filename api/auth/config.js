export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const publishableKey =
    process.env.CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    '';
  res.status(200).json({
    publishableKey,
    configured: Boolean(publishableKey && process.env.CLERK_SECRET_KEY),
  });
}
