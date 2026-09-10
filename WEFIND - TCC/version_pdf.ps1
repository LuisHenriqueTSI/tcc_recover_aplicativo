param (
    [switch]$KeepMainCopy
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$versoesDir = Join-Path $scriptDir "versoes_pdf"
if (-not (Test-Path $versoesDir)) {
    New-Item -ItemType Directory -Path $versoesDir | Out-Null
}

$versionFile = Join-Path $versoesDir "version.json"
# Checar se ainda estava na raiz e migrar se necessario
$oldVersionFile = Join-Path $scriptDir "version.json"
if ((Test-Path $oldVersionFile) -and (-not (Test-Path $versionFile))) {
    Move-Item $oldVersionFile $versionFile -Force
}

$mainPdf = Join-Path $scriptDir "main.pdf"
if (-not (Test-Path $mainPdf)) {
    $buildPdf = Join-Path $scriptDir "build\main.pdf"
    if (Test-Path $buildPdf) {
        $mainPdf = $buildPdf
    } else {
        Write-Error "Arquivo main.pdf não encontrado em $scriptDir nem em $scriptDir\build"
        exit 1
    }
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
$targetPdf = Join-Path $versoesDir $newPdfName

if ($KeepMainCopy) {
    Copy-Item $mainPdf $targetPdf -Force
    Write-Host "Copiado $mainPdf para versoes_pdf\$newPdfName"
} else {
    Move-Item $mainPdf $targetPdf -Force
    Write-Host "Movido $mainPdf para versoes_pdf\$newPdfName"
}

$newEntry = [PSCustomObject]@{
    version = $nextVersion
    filename = $newPdfName
    date = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
}
$versionData.current_version = $nextVersion
$versionData.history += $newEntry

$versionData | ConvertTo-Json -Depth 5 | Set-Content $versionFile -Encoding UTF8
Write-Host "Arquivo versionado gerado com sucesso: versoes_pdf\$newPdfName (Versão $nextVersion)"
