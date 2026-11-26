# Read-only smoke testing against a RUNNING SportHub backend.
# Windows PowerShell 5.1+; does not insert, delete, or mutate any data.
# Usage: .\scripts\Smoke-Test-TV4.ps1 -BaseUrl http://localhost:5000
param([string]$BaseUrl = "http://localhost:5000")
$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')
$failed = 0

function Test-Endpoint([string]$Label, [string]$Path, [int]$Expected) {
    $url = "$BaseUrl$Path"
    try {
        $result = Invoke-WebRequest -Uri $url -UseBasicParsing -Method Get -TimeoutSec 15
        $actual = [int]$result.StatusCode
    } catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $actual = [int]$_.Exception.Response.StatusCode
        } else {
            $actual = 0
            Write-Warning "$Label : $($_.Exception.Message)"
        }
    }
    if ($actual -eq $Expected) {
        Write-Host "PASS $Label | HTTP $actual" -ForegroundColor Green
    } else {
        Write-Host "FAIL $Label | expected $Expected, received $actual" -ForegroundColor Red
        $script:failed++
    }
}

Write-Host 'TV4 WEEK 8 - Read-only API smoke check' -ForegroundColor Cyan
Test-Endpoint 'Health' '/api/health' 200
Test-Endpoint 'Public social list' '/api/social-sessions' 200
Test-Endpoint 'Public social filter' '/api/social-sessions?sportId=2' 200
Test-Endpoint 'Social admin authorization' '/api/social-sessions/manage' 401
Test-Endpoint 'Player tickets authorization' '/api/social-tickets/mine' 401
Test-Endpoint 'Payment methods authorization' '/api/social-tickets/payment-methods' 401
Test-Endpoint 'Attendance authorization' '/api/social-sessions/1/attendance' 401
Test-Endpoint 'Player rating authorization' '/api/player-ratings/mine' 401

if ($failed -gt 0) {
    Write-Host "RESULT: $failed failure(s). Check API logs, port, route and roles." -ForegroundColor Red
    exit 1
}
Write-Host 'RESULT: all read-only smoke checks passed.' -ForegroundColor Green
exit 0
