Write-Host "Running Prisma Generate..."
npx prisma generate
Write-Host "Running Prisma DB Push..."
npx prisma db push --accept-data-loss
Write-Host "Prisma Setup Done."
