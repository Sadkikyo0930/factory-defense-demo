Option Explicit
Dim fs, shell, xl, wb, ws, stage, output, reportDate, sourcePath, message, rc, pickerPipe
Set fs = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
Set xl = Nothing
Set wb = Nothing
stage = "file picker"
If WScript.Arguments.Count=1 Then
    If WScript.Arguments(0)="--self-test" Then
        If Quantity(0,"test")<>"0" Or Quantity(Empty,"test")<>"null" Then Fail "Quantity self-test failed."
        If Zone("MNT")<>"MNT" Or Zone("TV")<>"TV" Then Fail "Group self-test failed."
        If J(U("4ECA 65E5")) <> Q("\u4ECA\u65E5") Then Fail "JSON escaping self-test failed."
        WScript.Echo "PASS VBScript numeric, group and JSON helpers"
        WScript.Quit 0
    End If
End If
On Error Resume Next
If WScript.Arguments.Count=1 Then
    If WScript.Arguments(0)="--merge-self-test" Then
        MergeSelfTest
    Else
        Fail "Unknown argument."
    End If
Else
    Main
End If
rc = Err.Number
message = Err.Description
Err.Clear
If Len(pickerPipe)>0 Then
    If fs.FileExists(pickerPipe) Then fs.DeleteFile pickerPipe
End If
If Not wb Is Nothing Then wb.Close False
If Not xl Is Nothing Then
    If xl.Workbooks.Count = 0 Then
        If Val(xl.Version) < 14 Then
            xl.Quit
        ElseIf xl.ProtectedViewWindows.Count = 0 Then
            xl.Quit
        End If
    End If
End If
On Error GoTo 0
If rc <> 0 Then
    WScript.Echo "[FAIL] " & stage & " 0x" & Hex(rc) & ": " & message
    WScript.Quit 1
End If

Sub Main()
    Dim picker, pipe, folder, handle, command, status, args, safe, wip, targets, env
    folder = fs.GetParentFolderName(WScript.ScriptFullName)
    picker = fs.BuildPath(folder, "daily_excel_picker_win7.ps1")
    pipe = fs.BuildPath(fs.GetSpecialFolder(2).Path, fs.GetTempName)
    Set handle = fs.CreateTextFile(pipe, False, True)
    pickerPipe = pipe
    handle.Close
    Set env = shell.Environment("PROCESS")
    env("FACTORY_RW_PICKER") = pipe
    safe = shell.ExpandEnvironmentStrings("%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe")
    command = Q(safe) & " -NoProfile -STA -File " & Q(picker)
    status = shell.Run(command, 1, True)
    Set handle = fs.OpenTextFile(pipe, 1, False, -1)
    If handle.AtEndOfStream Then
        args=Array()
    Else
        args = Split(handle.ReadAll, vbCrLf)
    End If
    handle.Close
    fs.DeleteFile pipe
    If status <> 0 Then Fail "File picker failed. If policy blocked it, contact IT."
    If UBound(args) < 2 Then
        WScript.Echo "Cancelled. No JSON was created."
        Exit Sub
    End If
    sourcePath = args(0)
    output = args(1)
    reportDate = args(2)
    If LCase(fs.GetExtensionName(output)) <> "json" Then Fail "Output must be .json."
    If fs.FileExists(output) Or fs.FolderExists(output) Then Fail "Output already exists."
    stage = "create Excel.Application"
    WScript.Echo "[BEGIN] " & stage
    Dim app
    Set app = CreateObject("Excel.Application")
    If app.Workbooks.Count <> 0 Then Fail "Cannot verify an empty Excel instance."
    Set xl = app
    stage = "configure Excel automation security"
    WScript.Echo "[BEGIN] " & stage
    xl.Visible = True
    xl.DisplayAlerts = True
    xl.EnableEvents = False
    xl.AskToUpdateLinks = False
    xl.AutomationSecurity = 3
    stage = "Workbooks.Open (read only; no external link updates)"
    WScript.Echo "[BEGIN] " & stage & ". Cancel any repair, macro, or Protected View prompt."
    Set wb = xl.Workbooks.Open(sourcePath, 0, True, , , , , , , , False, , False, , 0)
    If Val(xl.Version) >= 14 Then
        If xl.ProtectedViewWindows.Count > 0 Then Fail "Protected View: stop and ask IT."
    End If
    If Not wb.ReadOnly Then Fail "Excel did not return a read-only workbook."
    stage = "locate WIP headers and extract observations"
    WScript.Echo "[BEGIN] " & stage
    Set ws = wb.Worksheets(U("5E38 89C4 65E5 62A5"))
    ReadRows wip, targets
    wb.Close False
    Set wb = Nothing
    stage = "write new UTF-8 JSON"
    WScript.Echo "[BEGIN] " & stage
    SaveJson "{""date"":" & J(reportDate) & ",""rows"":[" & wip & "],""targetBaseline"":{""version"":1,""rows"":[" & targets & "]},""source"":{""tool"":""rw-win7-vbs"",""version"":""rw38.3"",""sheet"":" & J(U("5E38 89C4 65E5 62A5")) & ",""fileName"":" & J(fs.GetFileName(sourcePath)) & ",""todayHeader"":""WIP / today"",""targetHeader"":""WIP / target"",""readOnly"":true}}"
    WScript.Echo "JSON created. Review both groups in the game before confirming."
End Sub

Sub Fail(ByVal why)
    Err.Raise vbObjectError + 420, "RW WIP", why
End Sub

Sub MergeSelfTest()
    Dim rows
    stage="synthetic Excel COM MergeArea test"
    Set xl=CreateObject("Excel.Application")
    Set wb=xl.Workbooks.Add
    Set ws=wb.Worksheets(1)
    ws.Range("K49:K50").Merge
    ws.Range("L49:L50").Merge
    ws.Range("K51:K52").Merge
    ws.Range("K49").Value2=123
    ws.Range("L49").Value2=12
    ws.Range("K51").Value2=55
    If MetricValue(49,11)<>"123" Or MetricValue(50,11)<>"null" Then Fail "Target merge did not deduplicate."
    If MetricValue(49,12)<>"12" Or MetricValue(50,12)<>"null" Then Fail "Opening merge did not deduplicate."
    rows=""
    EmitMetric rows,U("9ED1 80F6"),"SHARED",51,11,"target",MetricValue(51,11)
    If InStr(rows,"""endRow"":52")=0 Or InStr(rows,"""target"":11")=0 Or InStr(rows,"""target"":44")=0 Then Fail "Black glue split or metadata incorrect."
    WScript.Echo "PASS real Excel COM synthetic merged cells, range metadata and black-glue split"
End Sub

Sub ReadRows(ByRef wip, ByRef targets)
    Dim role, wipHead, todayHead, targetHead, attendance, shiftHead
    role=U("5C97 4F4D"):wipHead="WIP" & U("60C5 51B5"):todayHead=U("4ECA 65E5 5B9E 7EE9")
    targetHead=U("76EE 6807"):attendance=U("51FA 52E4"):shiftHead=U("73ED 6B21")
    Dim used, firstR, firstC, endR, endC, topR, r,c,v, k, a, parent, jobHead, best, other
    Dim todayCol, targetCol, startR, candidates, groups, shifts, jobCol, value, label, valid, rc, cc
    Set used=ws.UsedRange
    firstR=used.Row:firstC=used.Column:endR=firstR+used.Rows.Count-1:endC=firstC+used.Columns.Count-1
    If (endR-firstR+1)*(endC-firstC+1)>200000 Then Fail "UsedRange too large; use an approved standalone export."
    topR=endR
    Dim grid
    grid=used.Value2
    If Not IsArray(grid) Then Fail "No tabular WIP data."
    Set candidates=CreateObject("Scripting.Dictionary")
    Set groups=CreateObject("Scripting.Dictionary")
    Set shifts=CreateObject("Scripting.Dictionary")
    For r=firstR To topR
        For c=firstC To endC
            v=Norm(grid(r-firstR+1,c-firstC+1))
            If v=todayHead And c-firstC>=2 Then
                Set a=Area(r,c)
                If a.Columns.Count=1 Then
                    Set parent=ParentHeader(grid,firstR,firstC,r,c,wipHead,attendance)
                    If Not parent Is Nothing Then
                        Set best=Nothing
                        For rc=r To firstR Step -1
                            For cc=firstC To c-3
                                k=Norm(grid(rc-firstR+1,cc-firstC+1))
                                If k=role Or k=role & U("660E 7EC6") Then
                                    Set other=Area(rc,cc)
                                    If other.Column+other.Columns.Count-1<c-2 Then
                                        If Not best Is Nothing Then Fail "Ambiguous job header."
                                        Set best=other
                                    End If
                                End If
                            Next
                        Next
                        If Not best Is Nothing Then
                            If candidates.Count>0 Then Fail "Multiple WIP actual columns."
                            candidates.Add "found", True
                            Set jobHead=best
                            todayCol=c:targetCol=c-2
                            startR=a.Row+a.Rows.Count
                            If jobHead.Row+jobHead.Rows.Count>startR Then startR=jobHead.Row+jobHead.Rows.Count
                            valid=False
                            For rc=parent.Row+parent.Rows.Count To startR-1
                                If Norm(Cell(rc,targetCol))=targetHead Then
                                    Set other=Area(rc,targetCol)
                                    If other.Columns.Count=1 And other.Column=targetCol Then
                                        Set best=ParentHeader(grid,firstR,firstC,other.Row,targetCol,wipHead,attendance)
                                        If Not best Is Nothing Then
                                            If best.Row=parent.Row And best.Column=parent.Column Then valid=True
                                        End If
                                    End If
                                End If
                            Next
                        End If
                    End If
                End If
            End If
        Next
    Next
    If candidates.Count<>1 Then Fail "Could not uniquely locate WIP actual column."
    If Not valid Then Fail "Actual column minus two is not a verified target in the same WIP group."
    ' Choose the only non-context column beneath the job heading.
    For c=jobHead.Column To jobHead.Column+jobHead.Columns.Count-1
        Dim samples
        samples=0
        For r=startR To endR
            v=Norm(Cell(r,c))
            If IsShift(v) Then
                If Not shifts.Exists(CStr(c)) Then shifts.Add CStr(c),c
            ElseIf Zone(v)<>"" Then
                If Not groups.Exists(CStr(c)) Then groups.Add CStr(c),c
            ElseIf v<>"" And Not IsNumeric(v) And Not IsSummary(v) Then
                samples=samples+1
            End If
            If r>=startR+39 Then Exit For
        Next
        If samples>0 And Not groups.Exists(CStr(c)) And Not shifts.Exists(CStr(c)) Then
            If jobCol>0 Then Fail "Ambiguous job name columns."
            jobCol=c
        End If
    Next
    If jobCol=0 Then Fail "No job name column."
    For r=firstR To startR-1
        For c=firstC To todayCol-1
            v=Norm(grid(r-firstR+1,c-firstC+1))
            If c<jobCol And (v=U("5DE5 533A") Or v=U("673A 79CD") Or v=U("7EC4 522B") Or v=U("7C7B 578B")) Then
                If Not groups.Exists(CStr(c)) Then groups.Add CStr(c),c
            End If
            If c<>jobCol And v=shiftHead Then
                If Not shifts.Exists(CStr(c)) Then shifts.Add CStr(c),c
            End If
        Next
    Next
    Dim group, explicitGroup, shift, name, precedingName, precedingShift, precedingGroup
    Dim actual, goal, foundActual, vgroup
    group="":precedingName="":foundActual=False
    For r=startR To endR
        explicitGroup="":vgroup=""
        For Each c In groups.Items
            v=Norm(Cell(r,c)):label=Zone(v)
            If label<>"" Then
                If explicitGroup<>"" And explicitGroup<>label Then Fail "Conflicting groups at row " & r
                explicitGroup=label
            ElseIf v<>"" Then
                vgroup="other"
            End If
        Next
        If explicitGroup<>"" Then
            group=explicitGroup
        ElseIf vgroup<>"" Then
            group=""
        End If
        shift=""
        For Each c In shifts.Items
            v=Norm(Cell(r,c))
            If IsShift(v) Then shift=v
        Next
        name=CStr(Cell(r,jobCol))
        If Trim(name)="" And shift<>"" And precedingShift<>"" And precedingShift<>shift And precedingGroup=group Then name=precedingName
        If IsSummary(Norm(name)) Then
            precedingName="":precedingShift=""
        Else
            actual=MetricValue(r,todayCol)
            goal=MetricValue(r,targetCol)
            If Trim(name)="" Then
                If actual<>"null" Or goal<>"null" Then Fail "Unattributed WIP at row " & r
                precedingName="":precedingShift=""
                If shift="" And explicitGroup="" Then group=""
            Else
                precedingName=CStr(Cell(r,jobCol)):precedingShift=shift:precedingGroup=group
                label=Left(Norm(name),3)
                If Left(label,2)="TV" Then label="TV"
                If label="TV" Or label="MNT" Then
                    If (group="TV" Or group="MNT") And label<>group Then Fail "Conflicting job prefix at row " & r
                Else
                    label=group
                End If
                If label="" Then
                    If Norm(name)=U("9ED1 80F6") Or Norm(name)=U("8131 6CE1") Or Norm(name)="FA" & U("5206 6790") Or Norm(name)="FA" & U("5206 6790 5C97") Then
                        label="SHARED"
                    Else
                        Fail "Unclassified job group at row " & r & ". Verify TV, MNT or shared."
                    End If
                End If
                If Norm(name)=U("9ED1 80F6") Or Norm(name)=U("9ED1 80F6 7EF4 4FEE") Then label="SHARED"
                If actual<>"null" Then EmitMetric wip,name,label,r,todayCol,"today",actual
                If goal<>"null" Then EmitMetric targets,name,label,r,targetCol,"target",goal
                If actual<>"null" Then foundActual=True
            End If
        End If
    Next
    If Not foundActual Then Fail "No numeric WIP observation."
End Sub

Function MetricValue(ByVal r, ByVal c)
    Dim a
    Set a=Area(r,c)
    MetricValue="null"
    If r=a.Row And c=a.Column Then MetricValue=Quantity(a.Cells(1,1).Value2,"R" & r & "C" & c)
End Function

Sub EmitMetric(ByRef list, ByVal name, ByVal group, ByVal r, ByVal c, ByVal field, ByVal value)
    Dim a, coord, tv, black
    Set a=Area(r,c)
    coord=",""row"":" & r & ",""column"":" & c & ",""mergeArea"":{""startRow"":" & a.Row & _
          ",""endRow"":" & (a.Row+a.Rows.Count-1) & ",""startColumn"":" & a.Column & _
          ",""endColumn"":" & (a.Column+a.Columns.Count-1) & "}"
    black=U("9ED1 80F6")
    If group="SHARED" And (Norm(name)=black Or Norm(name)=black & U("7EF4 4FEE")) Then
        tv=Int(CDbl(value)/5+0.5)
        coord=coord & ",""allocation"":""blackGlue-20-80"",""sourceName"":" & J(name)
        Append list,"{""name"":" & J("TV" & black) & ",""group"":""TV""" & coord & "," & J(field) & ":" & tv & "}"
        Append list,"{""name"":" & J("MNT" & black) & ",""group"":""MNT""" & coord & "," & J(field) & ":" & (CDbl(value)-tv) & "}"
    Else
        Append list,"{""name"":" & J(name) & ",""group"":" & J(group) & coord & "," & J(field) & ":" & value & "}"
    End If
End Sub

Function ParentHeader(ByRef grid, ByVal fr, ByVal fc, ByVal r, ByVal c, ByVal wipHead, ByVal attendance)
    Dim rr, a, n
    Set ParentHeader=Nothing
    For rr=r-1 To fr Step -1
        Set a=Area(rr,c)
        n=Norm(grid(a.Row-fr+1,a.Column-fc+1))
        If InStr(n,attendance)>0 Or InStr(n,U("4EBA 529B"))>0 Or InStr(n,U("4EA7 51FA"))>0 Or InStr(n,U("4EBA 5458"))>0 Then Exit Function
        If n=wipHead Then
            If a.Row+a.Rows.Count<=r Then Set ParentHeader=a
            Exit Function
        End If
    Next
End Function

Function Zone(ByVal n)
    Dim group, suffix
    For Each group In Array("TV","MNT")
        For Each suffix In Array("", U("7EF4 4FEE"), U("7EF4 4FEE 533A"), U("5DE5 533A"), U("533A 57DF"))
            If n=group & suffix Then Zone=group:Exit Function
        Next
    Next
    If n=U("5171 4EAB") Or n=U("5171 7528") Then Zone="SHARED"
End Function

Function IsShift(ByVal n)
    IsShift=(n=U("767D 73ED") Or n=U("591C 73ED"))
End Function

Function IsSummary(ByVal n)
    IsSummary=(n=U("5408 8BA1") Or n=U("5C0F 8BA1") Or n=U("603B 8BA1") Or n=U("5907 6CE8"))
End Function

Sub SaveJson(ByVal json)
    Dim stream, binary, bytes, temp, folder, code, description
    folder=fs.GetParentFolderName(output)
    temp=fs.BuildPath(folder,fs.GetTempName)
    Set stream=CreateObject("ADODB.Stream")
    stream.Type=2:stream.Charset="utf-8":stream.Open
    stream.WriteText json
    stream.Position=0:stream.Type=1:stream.Position=3
    bytes=stream.Read
    stream.Close
    Set binary=CreateObject("ADODB.Stream")
    binary.Type=1:binary.Open:binary.Write bytes
    binary.SaveToFile temp,1
    binary.Close
    On Error Resume Next
    fs.MoveFile temp, output
    code=Err.Number:description=Err.Description:Err.Clear
    If fs.FileExists(temp) Then fs.DeleteFile temp
    On Error GoTo 0
    If code<>0 Then Err.Raise code,"Write WIP JSON",description
End Sub

Function Q(ByVal s)
    Q = Chr(34) & s & Chr(34)
End Function

Function U(ByVal chars)
    Dim h, value
    value = ""
    For Each h In Split(chars, " ")
        value = value & ChrW(CLng("&H" & h))
    Next
    U = value
End Function

Function J(ByVal value)
    Dim i, ch, n, res
    res = ""
    For i = 1 To Len(value)
        ch = Mid(value, i, 1)
        n = AscW(ch) And 65535
        If n < 32 Or n > 126 Then
            res = res & "\u" & Right("0000" & Hex(n),4)
        ElseIf n = 34 Or n = 92 Then
            res = res & "\" & ch
        Else
            res = res & ch
        End If
    Next
    J = Q(res)
End Function

Function Norm(ByVal value)
    Dim s, i, c, n, result
    If IsError(value) Then
        Norm = ""
        Exit Function
    End If
    s = CStr(value)
    For i = 1 To Len(s)
        c = Mid(s,i,1)
        n = AscW(c) And 65535
        If n >= 65281 And n <= 65374 Then c = ChrW(n-65248)
        If n > 32 And n <> 12288 And n <> 160 And n <> 8203 And c <> "-" And c <> "_" Then result = result & c
    Next
    Norm = UCase(result)
End Function

Function Area(ByVal r, ByVal c)
    Dim cell
    Set cell=ws.Cells(r,c)
    If cell.MergeCells Then
        Set Area=cell.MergeArea
    Else
        Set Area=cell
    End If
End Function

Function Cell(ByVal r, ByVal c)
    Cell = Area(r,c).Cells(1,1).Value2
End Function

Function Quantity(ByVal value, ByVal coord)
    Dim re, s, n
    If IsError(value) Or IsNull(value) Or VarType(value) = 11 Then Fail "Invalid count at " & coord
    If IsEmpty(value) Or Trim(CStr(value)) = "" Then
        Quantity = "null"
        Exit Function
    End If
    If VarType(value) = 8 Then
        Set re = New RegExp
        re.Pattern = "^([0-9]+|[0-9]{1,3}(,[0-9]{3})+)$"
        s = Norm(value)
        If Not re.Test(s) Then Fail "Invalid count at " & coord
        n = CDbl(Replace(s,",",""))
    Else
        If Not IsNumeric(value) Then Fail "Invalid count at " & coord
        n = CDbl(value)
    End If
    If n < 0 Or n > 9007199254740991 Or n <> Fix(n) Then Fail "Invalid integer at " & coord
    Quantity = CStr(Fix(n))
    If InStr(Quantity,"E") > 0 Then Quantity = Replace(FormatNumber(n,0,0,0,0),",","")
End Function

Sub Append(ByRef list, ByVal item)
    If Len(list) > 0 Then list = list & ","
    list = list & item
End Sub
