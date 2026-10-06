#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Pulling Clerk keys into .env.local ..."
npx clerk env pull

echo ""
echo "Done. Start the site with: npm run dev"
echo "Open http://localhost:3000 and use Sign up (top right)."
