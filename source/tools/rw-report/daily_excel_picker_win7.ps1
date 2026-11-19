$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
[Windows.Forms.Application]::EnableVisualStyles()
$pick=New-Object Windows.Forms.OpenFileDialog
$pick.Title='Select the authorized RW daily workbook'
$pick.Filter='Excel (*.xlsx;*.xls;*.xlsb;*.xlsm)|*.xlsx;*.xls;*.xlsb;*.xlsm'
$pick.Multiselect=$false;$pick.CheckFileExists=$true;$pick.RestoreDirectory=$true
try{if($pick.ShowDialog() -ne 'OK'){exit 0};$inputFile=$pick.FileName}finally{$pick.Dispose()}
Add-Type -AssemblyName Microsoft.VisualBasic
$date=[Microsoft.VisualBasic.Interaction]::InputBox('Confirm report date (YYYY-MM-DD)','RW report date',(Get-Date -Format yyyy-MM-dd))
if(!$date){exit 0}
$parsed=[DateTime]::MinValue
if(![DateTime]::TryParseExact($date,'yyyy-MM-dd',[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::None,[ref]$parsed)){throw 'Invalid report date.'}
$save=New-Object Windows.Forms.SaveFileDialog
$save.Title='Select an approved destination for the WIP JSON'
$save.Filter='JSON (*.json)|*.json';$save.DefaultExt='json';$save.AddExtension=$true
$save.RestoreDirectory=$true;$save.CheckPathExists=$true;$save.OverwritePrompt=$false
$save.FileName='rw-wip-'+$date+'.json'
try{if($save.ShowDialog() -ne 'OK'){exit 0};$outputFile=$save.FileName}finally{$save.Dispose()}
[IO.File]::WriteAllLines($env:FACTORY_RW_PICKER,[string[]]@($inputFile,$outputFile,$date),[Text.Encoding]::Unicode)
