# PowerShell script to compile all frontend source files into a markdown document

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceDir = Join-Path $scriptPath "web-platform\frontend\src"
$outputFile = Join-Path $scriptPath "FRONTEND_CODE_BUNDLE.md"

# Get all TypeScript and TSX files
$allFiles = Get-ChildItem -Path $sourceDir -Recurse -File | Where-Object { $_.Extension -eq ".ts" -or $_.Extension -eq ".tsx" } | Sort-Object FullName

# Filter out files that don't exist (bracket notation issues)
$files = @()
foreach ($file in $allFiles) {
    if (Test-Path -LiteralPath $file.FullName) {
        $files += $file
    }
}

# Initialize markdown content
$markdown = @"
# Logixa Flow Frontend Code Bundle

**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Total Files:** $($files.Count)
**Source Directory:** $sourceDir

---

## Table of Contents

"@

# Add table of contents
$counter = 1
foreach ($file in $files) {
    $relativePath = $file.FullName.Replace($sourceDir, "").TrimStart("\").Replace("\", "/")
    $markdown += "$counter. [$relativePath](#$($relativePath.Replace('/', '-').Replace('.', '-')))`n"
    $counter++
}

$markdown += @"

---

## Directory Structure

```
"@

# Get directory tree
$tree = @()
$processedDirs = @()

foreach ($file in $files) {
    # Skip files that don't exist (bracket notation)
    if (-not (Test-Path -LiteralPath $file.FullName)) {
        continue
    }

    $relativePath = $file.FullName.Replace($sourceDir, "").TrimStart("\")
    $parts = $relativePath.Split("\")
    $currentPath = ""
    foreach ($part in $parts) {
        if ($currentPath -eq "") {
            $currentPath = $part
        } else {
            $currentPath = "$currentPath\$part"
        }
        if (-not $processedDirs.Contains($currentPath) -and -not $file.Name.Equals($part)) {
            $indent = "  " * ($currentPath.Split("\").Count - 1)
            $tree += "$indent$part/"
            $processedDirs += $currentPath
        }
    }
    $indent = "  " * ($parts.Count - 1)
    $tree += "$indent$($file.Name)"
}

$markdown += ($tree -join "`n") + "`n````"

$markdown += @"

---

## Source Code Files

"@

# Add each file's content
foreach ($file in $files) {
    $relativePath = $file.FullName.Replace($sourceDir, "").TrimStart("\").Replace("\", "/")
    $anchor = $relativePath.Replace('/', '-').Replace('.', '-')
    $extension = $file.Extension
    $lang = if ($extension -eq ".ts") { "typescript" } elseif ($extension -eq ".tsx") { "tsx" } else { "typescript" }

    # Check if file exists (handle bracket notation)
    if (Test-Path -LiteralPath $file.FullName) {
        $lines = (Get-Content -LiteralPath $file.FullName | Measure-Object -Line).Lines
        $contentArray = Get-Content -LiteralPath $file.FullName
        $content = $contentArray -join "`r`n"
    } else {
        $lines = 0
        $content = "# File not found or cannot be read"
    }

    $markdown += @"

### $relativePath

**Full Path:** $($file.FullName)
**Size:** $([math]::Round($file.Length / 1KB, 2)) KB
**Lines:** $lines

```$lang
"@

    $markdown += $content

    $markdown += @"
```

---
"@
}

# Write to file
$markdown | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "Successfully compiled $($files.Count) files into $outputFile"
