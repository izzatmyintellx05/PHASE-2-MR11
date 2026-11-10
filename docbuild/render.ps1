# Opens each Word file in Microsoft Word, refreshes its fields (table of contents, page
# numbers), saves it, and writes a PDF copy for checking. Usage: render.ps1 <docx folder> <pdf folder>
param([string]$DocDir, [string]$PdfDir)
New-Item -ItemType Directory -Force $PdfDir | Out-Null
# A lock file left by an earlier Word session makes Word ask "file in use" and hang
Get-ChildItem -Path $DocDir -Force -Filter '~$*' | Remove-Item -Force -Confirm:$false
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  # List the files first: while a document is open Word writes a ~$ lock file beside it
  $files = @(Get-ChildItem -Path $DocDir -Filter *.docx | Where-Object { $_.Name -notlike '~$*' })
  $files | ForEach-Object {
    $doc = $word.Documents.Open($_.FullName, $false, $false, $false)
    $doc.Fields.Update() | Out-Null
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    $doc.Save()
    $pdf = Join-Path $PdfDir ($_.BaseName + '.pdf')
    $doc.ExportAsFixedFormat($pdf, 17)
    "{0}  pages={1}" -f $_.Name, $doc.ComputeStatistics(2)
    $doc.Close()
  }
} finally {
  $word.Quit()
}
