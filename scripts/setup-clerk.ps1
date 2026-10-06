# Run once in the project folder after: npx clerk auth login
Set-Location $PSScriptRoot\..

Write-Host "Pulling Clerk keys into .env.local ..."
npx clerk env pull

Write-Host ""
Write-Host "Done. Start the site with: npm run dev"
Write-Host "Open http://localhost:3000 and use Sign up (top right)."
