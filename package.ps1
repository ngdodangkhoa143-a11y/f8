$source = "C:\Users\Administrator\Downloads\f8client\code\bin\five\release"
$dest = "C:\Users\Administrator\Downloads\f8client\package_temp"

# Remove existing temp dir if any
if (Test-Path $dest) {
    Remove-Item -Path $dest -Recurse -Force
}

# Create temp dir
New-Item -ItemType Directory -Force -Path $dest | Out-Null

# Copy everything except PDBs and caches
Get-ChildItem -Path $source -Recurse -Exclude *.pdb, *.exp, *.lib, *.formaldev, *.exe.formaldev, *.tlog | Where-Object { 
    $_.FullName -notmatch '\\data\\cache' -and 
    $_.FullName -notmatch '\\data\\server-cache' -and 
    $_.FullName -notmatch '\\data\\game-storage' 
} | ForEach-Object {
    $targetPath = $_.FullName.Replace($source, $dest)
    if ($_.PSIsContainer) {
        if (!(Test-Path $targetPath)) {
            New-Item -ItemType Directory -Force -Path $targetPath | Out-Null
        }
    } else {
        $parentDir = Split-Path $targetPath
        if (!(Test-Path $parentDir)) {
            New-Item -ItemType Directory -Force -Path $parentDir | Out-Null
        }
        Copy-Item -Path $_.FullName -Destination $targetPath -Force
    }
}
