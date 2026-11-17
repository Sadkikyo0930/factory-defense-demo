param([string]$OutputDirectory)
$ErrorActionPreference='Stop'
. "$PSScriptRoot/Extract-DailyWip.ps1" -LibraryOnly
function Assert($Value,[string]$Message){if(!$Value){throw ('ASSERT: '+$Message)}}
Assert ((Normalize-Header "岗　位`n明细") -eq '岗位明细') 'normalization'
$headers=@(@{Row=65;Col=2;EndRow=77;EndCol=4;Key='岗位明细'},@{Row=65;Col=10;EndRow=66;EndCol=13;Key='WIP情况'},@{Row=73;Col=12;EndRow=77;EndCol=12;Key='今日实绩'},@{Row=65;Col=5;EndRow=66;EndCol=8;Key='人员出勤'},@{Row=73;Col=7;EndRow=77;EndCol=7;Key='今日实绩'},@{Row=65;Col=1;EndRow=77;EndCol=1;Key='工区'})
$plans=@(Resolve-WipPlans $headers);Assert ($plans.Count -eq 1) 'unique WIP candidate';$plan=$plans[0];Assert ($plan.TodayCol -eq 12 -and $plan.StartRow -eq 78) 'merged layout'
$script:values=@{};$names=@('FA分析岗','祛除','BD','UV','POL','覆膜','PI','VI','OUT','黑胶');$counts=@(61,28,66,5,6,23,16,59,4,43)
for($i=0;$i -lt $names.Length;$i++){for($n=0;$n -lt 2;$n++){$r=78+$i*2+$n;$script:values["$r`:1"]=$(if($i -eq 0 -or $i -eq 9){'共享'}else{'TV'});$script:values["$r`:3"]=$names[$i];$script:values["$r`:4"]=$(if($n -eq 0){'白班'}else{'夜班'});$script:values["$r`:12"]=$counts[$i]}}
function Get-CellRecord($Sheet,[int]$Row,[int]$Col){return @{Row=$Row;Col=$Col;EndRow=$Row;EndCol=$Col;Value=$script:values["$Row`:$Col"]}}
function Get-LastValueRow($Sheet,[int]$Column){return 97}
$col=Resolve-JobColumn $null $plan 0;Assert ($col -eq 3) 'generic job column selection (no business mapper)';$rows=@(Read-WipRows $null $plan $col);Assert ($rows.Count -eq 20) 'keep day/night observations'
if(!(Test-Path -LiteralPath $OutputDirectory)){[void][IO.Directory]::CreateDirectory($OutputDirectory)};$jsonPath=Join-Path $OutputDirectory 'com-synthetic.json';if(Test-Path -LiteralPath $jsonPath){Remove-Item -LiteralPath $jsonPath}
Write-ReportJson $jsonPath '2026-11-17' $rows @{tool='synthetic-com-helper-test';readOnly=$true;fileName='SYNTHETIC-ONLY.xlsx';sheet='常规日报'}
$raw=[IO.File]::ReadAllBytes($jsonPath);Assert (!($raw[0] -eq 239 -and $raw[1] -eq 187 -and $raw[2] -eq 191)) 'UTF8 no BOM'
$failed=$false;try{Write-ReportJson $jsonPath '2026-11-17' $rows @{}}catch{$failed=$true};Assert $failed 'refuse output overwrite'
$bad=@(@{Row=1;Col=1;EndRow=1;EndCol=1;Key='岗位明细'},@{Row=1;Col=2;EndRow=1;EndCol=2;Key='人员出勤'},@{Row=2;Col=2;EndRow=2;EndCol=2;Key='今日实绩'});Assert (@(Resolve-WipPlans $bad).Count -eq 0) 'attendance is not WIP'
Write-Host 'PASS pure PowerShell helpers, merged headers, scoped extraction, UTF8 JSON and overwrite refusal; Excel COM NOT launched'
