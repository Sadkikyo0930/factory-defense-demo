#requires -Version 2.0
[CmdletBinding()]
param([string]$InputPath,[string]$OutputPath,[string]$ReportDate,[int]$JobColumn=0,[switch]$LibraryOnly)
$ErrorActionPreference='Stop'
function Normalize-Header($Value) { return ([string]$Value).Normalize([Text.NormalizationForm]::FormKC).ToUpperInvariant() -replace '[\s\u200B_-]','' }
function Release-Com($Value) { if($null -ne $Value -and [Runtime.InteropServices.Marshal]::IsComObject($Value)){try{[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($Value)}catch{}} }
function Get-CellRecord($Sheet,[int]$Row,[int]$Col) {
    $cell=$Sheet.Cells.Item($Row,$Col);$area=$cell.MergeArea;$top=$area.Cells.Item(1,1)
    return @{Row=[int]$area.Row;Col=[int]$area.Column;EndRow=([int]$area.Row+[int]$area.Rows.Count-1);EndCol=([int]$area.Column+[int]$area.Columns.Count-1);Value=$top.Value2}
}
function Find-HeaderRecords($Sheet) {
    $records=New-Object Collections.ArrayList;$seen=@{};$used=$Sheet.UsedRange;$missing=[Type]::Missing
    foreach($pattern in @('*岗*位*','*情*况*','*出*勤*','*今*日*实*绩*','*工*区*','*类*型*','*机*种*','*组*别*','*班*次*')){
        $hit=$used.Find($pattern,$missing,-4163,2,1,1,$false,$false,$false)
        if($null -eq $hit){continue};$first=[string]$hit.Address($false,$false,1);$iteration=0
        do {
            if(++$iteration -gt 256){throw '表头候选过多，无法安全确定，请导出单一常规日报。'}
            $record=Get-CellRecord $Sheet ([int]$hit.Row) ([int]$hit.Column);$key=Normalize-Header $record.Value;$id=[string]$record.Row+':'+[string]$record.Col
            if(((@('岗位','岗位明细','WIP情况','今日实绩','工区','类型','机种','组别','班次') -contains $key) -or $key -match '人员|出勤|人力') -and !$seen.ContainsKey($id)){$record.Key=$key;[void]$records.Add($record);$seen[$id]=$true}
            $hit=$used.Find($pattern,$hit,-4163,2,1,1,$false,$false,$false)
        }while($null -ne $hit -and [string]$hit.Address($false,$false,1) -ne $first)
    }
    return $records.ToArray()
}
function Resolve-WipPlans([object[]]$Headers) {
    $plans=New-Object Collections.ArrayList
    foreach($today in @($Headers|Where-Object {$_.Key -eq '今日实绩'})){
        $parents=@($Headers|Where-Object {$_.Key -eq 'WIP情况' -and $_.EndRow -lt $today.Row -and $_.Col -le $today.Col -and $_.EndCol -ge $today.EndCol}|Sort-Object Row -Descending)
        if($parents.Count -eq 0){continue};$parent=$parents[0]
        $blocked=@($Headers|Where-Object {$_.Row -gt $parent.EndRow -and $_.Row -lt $today.Row -and $_.Col -le $today.Col -and $_.EndCol -ge $today.EndCol -and $_.Key -match '人员|出勤|人力'})
        if($blocked.Count){continue}
        $roles=@($Headers|Where-Object {(@('岗位','岗位明细') -contains $_.Key) -and $_.EndCol -lt $today.Col})
        if(!$roles.Count){continue};$ranked=@($roles|Sort-Object @{Expression={[Math]::Max(0,[Math]::Max($_.Row-$today.EndRow,$today.Row-$_.EndRow))}})
        $distance=[Math]::Max(0,[Math]::Max($ranked[0].Row-$today.EndRow,$today.Row-$ranked[0].EndRow))
        $nearest=@($ranked|Where-Object {[Math]::Max(0,[Math]::Max($_.Row-$today.EndRow,$today.Row-$_.EndRow)) -eq $distance})
        if($nearest.Count -ne 1){continue};$role=$nearest[0];$start=[Math]::Max($role.EndRow,$today.EndRow)+1
        $next=@($Headers|Where-Object {$_.Row -ge $start -and (@('岗位','岗位明细','WIP情况') -contains $_.Key)}|Sort-Object Row)
        $end=1048576;if($next.Count){$end=$next[0].Row-1}
        [void]$plans.Add(@{Role=$role;TodayCol=$today.Col;StartRow=$start;EndRow=$end;Headers=$Headers})
    }
    return $plans.ToArray()
}
function Get-LastValueRow($Sheet,[int]$Column){$r=$Sheet.Columns.Item($Column).Find('*',[Type]::Missing,-4163,2,1,2,$false,$false,$false);if($null -eq $r){return 0};return [int]$r.Row}
function Resolve-JobColumn($Sheet,$Plan,[int]$Requested) {
    if($Requested -gt 0){if($Requested -ge $Plan.TodayCol){throw '指定岗位列必须在今日实绩列左侧。'};return $Requested}
    if($Plan.Role.EndCol-$Plan.Role.Col -gt 16){throw '岗位明细合并区域过宽，请用 -JobColumn 指定实际岗位名称列号。'}
    $rank=New-Object Collections.ArrayList
    for($c=$Plan.Role.Col;$c -le $Plan.Role.EndCol;$c++){
        $distinct=@{};$count=0
        for($r=$Plan.StartRow;$r -le [Math]::Min($Plan.EndRow,$Plan.StartRow+39);$r++){
            $value=(Get-CellRecord $Sheet $r $c).Value;$n=Normalize-Header $value;$numeric=0.0
            if(!$n -or (@('白班','夜班','TV','MNT','共享','合计','小计','总计') -contains $n) -or $n -match '^(TV|MNT)(维修|维修区|工区|区域)?$' -or [double]::TryParse([string]$value,[ref]$numeric)){continue}
            $distinct[$n]=$true;$count++
        }
        if($distinct.Count){[void]$rank.Add(@{Column=$c;Distinct=$distinct.Count;Count=$count})}
    }
    $ranked=@($rank|Sort-Object @{Expression={$_.Distinct};Descending=$true},@{Expression={$_.Count};Descending=$true})
    if(!$ranked.Count){throw '岗位明细下没有可确认的名称列，请用 -JobColumn 指定列号。'}
    if($ranked.Count -gt 1){throw '岗位名称列存在歧义；未输出JSON。请用 -JobColumn 指定列号。'}
    return [int]$ranked[0].Column
}
function Read-WipRows($Sheet,$Plan,[int]$Column) {
    $last=[Math]::Min($Plan.EndRow,[Math]::Max((Get-LastValueRow $Sheet $Column),(Get-LastValueRow $Sheet $Plan.TodayCol))+1)
    if($last-$Plan.StartRow -gt 20000){throw '目标岗位区域超过两万行，请导出精简日报。'}
    $groups=@($Plan.Headers|Where-Object {(@('工区','类型','机种','组别') -contains $_.Key) -and $_.Col -lt $Column -and $_.Row -lt $Plan.StartRow}|ForEach-Object {$_.Col}|Select-Object -Unique)
    $contextColumns=New-Object Collections.ArrayList;foreach($c in $groups){[void]$contextColumns.Add($c)};for($c=$Plan.Role.Col;$c -lt $Column;$c++){[void]$contextColumns.Add($c)};$groups=@($contextColumns|Select-Object -Unique)
    $shifts=New-Object Collections.ArrayList
    for($c=$Plan.Role.Col;$c -le $Plan.Role.EndCol;$c++){if($c -eq $Column){continue};for($r=$Plan.StartRow;$r -le [Math]::Min($last,$Plan.StartRow+7);$r++){if((@('白班','夜班') -contains (Normalize-Header (Get-CellRecord $Sheet $r $c).Value))){[void]$shifts.Add($c);break}}}
    $rows=New-Object Collections.ArrayList;$group=$null;$previous=$null
    for($r=$Plan.StartRow;$r -le $last;$r++){
        foreach($c in $groups){$n=Normalize-Header (Get-CellRecord $Sheet $r $c).Value;if($n -match '^(TV|MNT)(维修|维修区|工区|区域)?$'){$group=$matches[1]}elseif($n){$group=$null}}
        $cell=Get-CellRecord $Sheet $r $Column;$name=[string]$cell.Value;$today=(Get-CellRecord $Sheet $r $Plan.TodayCol).Value;$shift=''
        foreach($c in $shifts){$s=Normalize-Header (Get-CellRecord $Sheet $r $c).Value;if((@('白班','夜班') -contains $s)){$shift=$s;break}}
        if(!$name.Trim() -and $null -ne $previous -and $shift -and $previous.Shift -and $previous.Shift -ne $shift -and $previous.Row -eq $r-1){$name=$previous.Name;$previous=$null}
        elseif($name.Trim() -and $cell.Row -eq $r){$previous=@{Name=$name;Row=$r;Shift=$shift}}else{$previous=$null}
        if(!$name.Trim()){if($null -eq $today -and !$shift){$group=$null};continue}
        if((@('合计','总计','小计','备注','说明') -contains (Normalize-Header $name))){continue}
        if($null -ne $today -and [string]$today -ne '' -and !($today -is [ValueType])){
            $number=0.0;if(![double]::TryParse([string]$today,[Globalization.NumberStyles]::Float -bor [Globalization.NumberStyles]::AllowThousands,[Globalization.CultureInfo]::InvariantCulture,[ref]$number)){throw ('第'+$r+'行的今日实绩不是数值；未输出正文或JSON，请在Excel中核对。')};$today=$number
        }
        $entry=@{name=$name;today=$today};if($group){$entry.group=$group};[void]$rows.Add($entry)
    }
    if(!$rows.Count){throw '目标列没有可提取的岗位行，未生成JSON。'};return $rows.ToArray()
}
function Write-ReportJson([string]$Path,[string]$Date,[object[]]$Rows,$Source) {
    $parsed=[DateTime]::MinValue;if(![DateTime]::TryParseExact($Date,'yyyy-MM-dd',[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::None,[ref]$parsed)){throw '日报日期必须是有效的yyyy-MM-dd。'}
    if([IO.Path]::GetExtension($Path).ToLowerInvariant() -ne '.json'){throw '输出必须是.json文件。'}
    if(Test-Path -LiteralPath $Path){throw '输出JSON已存在；为保留旧数据，请另选文件名。'}
    Add-Type -AssemblyName System.Web.Extensions
    $serializer=New-Object System.Web.Script.Serialization.JavaScriptSerializer;$serializer.MaxJsonLength=20971520
    $payload=@{date=$Date;rows=$Rows;source=$Source};$json=$serializer.Serialize($payload)
    $full=[IO.Path]::GetFullPath($Path);$temp=$full+'.'+[Guid]::NewGuid().ToString('N')+'.tmp'
    try{[IO.File]::WriteAllText($temp,$json,(New-Object Text.UTF8Encoding($false)));[IO.File]::Move($temp,$full)}finally{if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Force}}
}
function Get-FileDigest([string]$Path){$stream=[IO.File]::Open($Path,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite);$sha=[Security.Cryptography.SHA256]::Create();try{return [BitConverter]::ToString($sha.ComputeHash($stream))}finally{$stream.Dispose();$sha.Dispose()}}
function Pick-ReportDate {Add-Type -AssemblyName System.Windows.Forms;$form=New-Object Windows.Forms.Form;$form.Text='确认日报实际日期（不要误选昨日）';$form.Width=420;$form.Height=150;$date=New-Object Windows.Forms.DateTimePicker;$date.Format='Custom';$date.CustomFormat='yyyy-MM-dd';$date.Left=20;$date.Top=20;$ok=New-Object Windows.Forms.Button;$ok.Text='确认';$ok.DialogResult='OK';$ok.Left=260;$ok.Top=55;$form.Controls.Add($date);$form.Controls.Add($ok);$form.AcceptButton=$ok;try{if($form.ShowDialog() -ne 'OK'){throw '用户取消日期选择。'};return $date.Value.ToString('yyyy-MM-dd')}finally{$form.Dispose()}}
function Invoke-Extraction {
    Add-Type -AssemblyName System.Windows.Forms
    if(!$InputPath){$pick=New-Object Windows.Forms.OpenFileDialog;$pick.Title='选择有权限读取的日报（不解除密码/保护）';$pick.Filter='Excel与兼容报表|*.xlsx;*.xls;*.xlsb;*.xml;*.html;*.htm';$pick.CheckFileExists=$true;try{if($pick.ShowDialog() -ne 'OK'){throw '用户取消文件选择。'};$InputPath=$pick.FileName}finally{$pick.Dispose()}}
    $inputFull=[IO.Path]::GetFullPath($InputPath);if(!(Test-Path -LiteralPath $inputFull -PathType Leaf)){throw '输入文件不存在或不可读取。'}
    if(!$ReportDate){$ReportDate=Pick-ReportDate}
    if(!$OutputPath){$save=New-Object Windows.Forms.SaveFileDialog;$save.Title='另存本地WIP JSON（不上传）';$save.Filter='JSON文件|*.json';$save.FileName=[IO.Path]::GetFileNameWithoutExtension($inputFull)+'.wip.'+[DateTime]::Now.ToString('yyyyMMdd-HHmmss')+'.json';try{if($save.ShowDialog() -ne 'OK'){throw '用户取消输出选择。'};$OutputPath=$save.FileName}finally{$save.Dispose()}}
    $outputFull=[IO.Path]::GetFullPath($OutputPath);if($inputFull.Equals($outputFull,[StringComparison]::OrdinalIgnoreCase) -or (Test-Path -LiteralPath $outputFull)){throw '不能覆盖原文件或已有JSON，请选择新的输出路径。'}
    $tempRoot=[IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) 'FactoryDefenseWip'));$tempDir=Join-Path $tempRoot ([Guid]::NewGuid().ToString('N'))
    foreach($destination in @($outputFull,$tempDir)){if($destination.StartsWith('\\') -or (New-Object IO.DriveInfo([IO.Path]::GetPathRoot($destination))).DriveType -eq [IO.DriveType]::Network){throw '输出或临时目录位于网络磁盘，已停止；请改用本地磁盘目录。'}}
    $excel=$null;$book=$null;$books=$null;$sheet=$null;$ownsExcel=$false
    try{
        [void][IO.Directory]::CreateDirectory($tempDir);$copy=Join-Path $tempDir ([IO.Path]::GetFileName($inputFull))
        try{$before=Get-FileDigest $inputFull;Copy-Item -LiteralPath $inputFull -Destination $copy -ErrorAction Stop}catch{throw '无法读取/复制日报：可能被独占锁定或无权限。不会解锁或关闭任何现有Excel，请另存可读取副本。'}
        try{$excel=New-Object -ComObject Excel.Application}catch{throw '无法启动已安装的Microsoft Excel COM；请确认Excel已安装且获得公司授权。'}
        $books=$excel.Workbooks;if($books.Count -ne 0){throw '不能确认独立Excel实例，已停止，不关闭任何已有工作簿。'};$ownsExcel=$true
        $excel.Visible=$true;$excel.DisplayAlerts=$true;$excel.EnableEvents=$false;$excel.AskToUpdateLinks=$false;$excel.AutomationSecurity=3
        $missing=[Type]::Missing
        try{$book=$books.Open($copy,0,$true,$missing,$missing,$missing,$true,$missing,$missing,$false,$false,$missing,$false,$true,0)}catch{throw 'Excel未能合法打开只读副本（密码、权限、受保护视图或格式问题）。工具不解除保护，不尝试密码；请在Excel中按权限处理。'}
        if($null -eq $book -or !$book.ReadOnly){throw 'Excel未返回只读工作簿，已停止。'}
        $found=New-Object Collections.ArrayList;$preferred=New-Object Collections.ArrayList
        for($i=1;$i -le $book.Worksheets.Count;$i++){$ws=$book.Worksheets.Item($i);if((Normalize-Header $ws.Name) -eq '常规日报'){[void]$preferred.Add([string]$ws.Name)}}
        for($i=1;$i -le $book.Worksheets.Count;$i++){
            $ws=$book.Worksheets.Item($i);if($preferred.Count -gt 0 -and $preferred -notcontains [string]$ws.Name){continue}
            $headers=@(Find-HeaderRecords $ws);foreach($plan in @(Resolve-WipPlans $headers)){$plan.Sheet=[string]$ws.Name;[void]$found.Add($plan)}
        }
        if($found.Count -ne 1){throw ('未能唯一确认 岗位明细/岗位 → WIP情况 → 今日实绩，候选区域数：'+$found.Count+'。未使用目标/昨日/BAL替代。')}
        $plan=$found[0];$sheet=$book.Worksheets.Item($plan.Sheet);$column=Resolve-JobColumn $sheet $plan $JobColumn;$rows=@(Read-WipRows $sheet $plan $column)
        $book.Close($false);Release-Com $sheet;Release-Com $book;$sheet=$null;$book=$null
        if((Get-FileDigest $inputFull) -ne $before){throw '原文件在提取期间发生变化，已停止输出。请重新选择稳定的下载副本。'}
        Write-ReportJson $outputFull $ReportDate $rows @{tool='factory-defense-excel-readonly-v1';fileName=[IO.Path]::GetFileName($inputFull);sheet=$plan.Sheet;jobColumn=$column;todayColumn=$plan.TodayCol;readOnly=$true;dateConfirmedByUser=$true}
        Write-Host ('完成：已生成 '+$outputFull+'；请在游戏选择“导入日报”读取JSON并核对预览。未修改原始日报。')
    }finally{
        if($null -ne $book){try{$book.Close($false)}catch{}}
        Release-Com $sheet;Release-Com $book;Release-Com $books
        if($ownsExcel -and $null -ne $excel){try{$protected=0;if([int](([string]$excel.Version).Split('.')[0]) -ge 14){$protected=$excel.ProtectedViewWindows.Count};if($excel.Workbooks.Count -eq 0 -and $protected -eq 0){$excel.Quit()}else{Write-Warning '该独立Excel实例中还有其他工作簿或受保护视图，未退出Excel，请自行处理。'}}catch{Write-Warning '无法确认Excel实例为空，未自动退出。'}}
        Release-Com $excel;[GC]::Collect();[GC]::WaitForPendingFinalizers();[GC]::Collect();[GC]::WaitForPendingFinalizers()
        $resolved=[IO.Path]::GetFullPath($tempDir);$rootPrefix=$tempRoot.TrimEnd('\')+'\'
        if($resolved.StartsWith($rootPrefix,[StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($resolved) -match '^[a-f0-9]{32}$' -and (Test-Path -LiteralPath $resolved)){try{Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction Stop}catch{Write-Warning ('临时副本仍被占用，未强制解锁；请在Excel中自行处理后清理：'+$resolved)}}
    }
}
if($LibraryOnly){return}
try{Invoke-Extraction}catch{Write-Error ('提取停止：'+$_.Exception.Message);exit 1}
