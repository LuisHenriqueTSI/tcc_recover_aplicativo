param (
    [switch]$KeepMainCopy
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$versionFile = Join-Path $scriptDir "version.json"
$mainPdf = Join-Path $scriptDir "main.pdf"

if (-not (Test-Path $mainPdf)) {
    Write-Error "Arquivo main.pdf não encontrado em $scriptDir"
    exit 1
}

$versionData = @{ current_version = 0; history = @() }
if (Test-Path $versionFile) {
    try {
        $jsonContent = Get-Content $versionFile -Raw | ConvertFrom-Json
        $versionData.current_version = $jsonContent.current_version
        if ($jsonContent.history) {
            $versionData.history = @($jsonContent.history)
        }
    } catch {
        Write-Warning "Não foi possível carregar version.json existente, iniciando em 0."
    }
}

$nextVersion = $versionData.current_version + 1
$timestamp = Get-Date -Format "dd-MM-yyyy-HH\hmm"
$newPdfName = "TCC_WeFIND_v${nextVersion}_${timestamp}.pdf"
$targetPdf = Join-Path $scriptDir $newPdfName

if ($KeepMainCopy) {
    Copy-Item $mainPdf $targetPdf -Force
    Write-Host "Copiado $mainPdf para $newPdfName"
} else {
    Move-Item $mainPdf $targetPdf -Force
    Write-Host "Renomeado $mainPdf para $newPdfName"
}

$newEntry = [PSCustomObject]@{
    version = $nextVersion
    filename = $newPdfName
    date = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
}
$versionData.current_version = $nextVersion
$versionData.history += $newEntry

$versionData | ConvertTo-Json -Depth 5 | Set-Content $versionFile -Encoding UTF8
Write-Host "Arquivo versionado gerado com sucesso: $newPdfName (Versão $nextVersion)"
