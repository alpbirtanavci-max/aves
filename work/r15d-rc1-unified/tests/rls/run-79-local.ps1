<#
  AVES R15D — migration 79 yerel dört-persona RLS kanıtı.

  İzole bir PostgreSQL 17 container'ı başlatır, test bootstrap'ını ve gerçek
  migration 79 SQL'ini uygular, ardından senaryo dosyasını çalıştırır. Container
  finally bloğunda silinir; hostta, Supabase'de veya canlı veride kalıcı değişiklik
  oluşturmaz.

  Bu test canlı Supabase şemasının yerine geçmez. Production öncesinde aynı senaryo
  gerçek bir Supabase branch/staging ortamında da çalıştırılmalıdır.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$testDir = Split-Path -Parent $PSCommandPath
$root = Split-Path -Parent (Split-Path -Parent $testDir)
$container = "aves-rls79-$PID"

function Invoke-PsqlFile([string]$path) {
  Get-Content -Raw -LiteralPath $path |
    docker exec -i $container psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres
  if ($LASTEXITCODE -ne 0) {
    throw "SQL testi başarısız oldu: $path"
  }
}

try {
  docker run --rm -d --name $container -e POSTGRES_PASSWORD=local-test postgres:17 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'İzole PostgreSQL container başlatılamadı.' }

  $ready = $false
  foreach ($attempt in 1..30) {
    docker exec $container pg_isready -U postgres -d postgres | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw 'İzole PostgreSQL hazır olmadı.' }

  Invoke-PsqlFile (Join-Path $testDir '79_local_bootstrap.sql')
  Invoke-PsqlFile (Join-Path $root 'database\79_r15d_rc3940_takip_atanan_yetki.sql')
  Invoke-PsqlFile (Join-Path $testDir '79_takip_atama.sql')
  Write-Host 'PASS  Yerel dört-persona RLS senaryosu başarıyla tamamlandı.'
}
finally {
  docker rm -f $container 2>$null | Out-Null
}
