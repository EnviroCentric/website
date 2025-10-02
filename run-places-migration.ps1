# PowerShell script to run Google Places database migration
# This script will execute the migration inside your Docker backend container

Write-Host "🚀 Running Google Places database migration..." -ForegroundColor Green

# Check if Docker Compose is running
$containers = docker-compose ps -q
if ([string]::IsNullOrEmpty($containers)) {
    Write-Host "❌ Docker Compose services are not running. Please start them first with:" -ForegroundColor Red
    Write-Host "   docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

# Execute the migration SQL file
Write-Host "📦 Executing Google Places migration..." -ForegroundColor Blue
docker-compose exec -T db psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -f - < backend/app/db/migrations/0002_add_google_places_fields.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Google Places migration completed successfully!" -ForegroundColor Green
    Write-Host "🗺️  Your application now supports Google Places integration!" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed. Please check the error messages above." -ForegroundColor Red
    exit 1
}