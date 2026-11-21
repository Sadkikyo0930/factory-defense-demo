#requires -Version 3.0
param(
    [Parameter(Mandatory=$true)][string]$WipPath,
    [Parameter(Mandatory=$true)][string]$PlanPath,
    [Parameter(Mandatory=$true)][string]$OutputPath
)
$ErrorActionPreference='Stop'
$report=Get-Content -LiteralPath $WipPath -Raw -Encoding UTF8 | ConvertFrom-Json
$inputPlan=Get-Content -LiteralPath $PlanPath -Raw -Encoding UTF8 | ConvertFrom-Json
$plan=if($inputPlan.productionPlan){$inputPlan.productionPlan}else{$inputPlan}
if($report.date -notmatch '^\d{4}-\d{2}-\d{2}$' -or !$report.rows -or !$report.targetBaseline -or $report.targetBaseline.version -ne 1){
    throw 'Expected a fresh WIP JSON from Read-RW-WIP.bat with rows and targetBaseline.'
}
if($plan.kind -ne 'rw-mdl-plan' -or $plan.schemaVersion -ne 1 -or !$plan.rows -or
    $plan.date -ne $report.date -or $plan.dateKey -ne $report.date.Replace('-','')){
    throw 'The production plan must be a V3 plan for the same report date.'
}
if([IO.Path]::GetExtension($OutputPath) -ne '.json'){throw 'Output must have a .json extension.'}
$combined=[ordered]@{
    date=$report.date
    rows=$report.rows
    targetBaseline=$report.targetBaseline
    source=$report.source
    productionPlan=$plan
}
$encoding=New-Object Text.UTF8Encoding($false)
$bytes=$encoding.GetBytes(($combined | ConvertTo-Json -Depth 20))
$path=$ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
$stream=[IO.File]::Open($path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
try{$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
Write-Output 'Combined JSON is ready for the game preview.'
