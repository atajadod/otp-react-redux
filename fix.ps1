cls
function FixInFile ($file,$searchForIfNotFound, $searchFor, $addStr, [bool]$before)
{
    $fileExists=[System.IO.File]::Exists($file)
    if ($fileExists -eq $true){            
        $text=[System.IO.File]::ReadAllText($file)
        $index=$text.IndexOf($searchForIfNotFound)
        if ($index -eq -1){
            $index=$text.IndexOf($searchFor)
            if ($index -ne -1){
                $sb=([System.Text.StringBuilder]$text)
                $newIndex=$index
                if ($before -eq $false)
                {
                    $newIndex=$newIndex + $searchFor.Length                    
                }
                $sb.Insert($newIndex,$addStr)            
                [System.IO.File]::WriteAllText($file,$sb.ToString())
            }
        }
    }   
}

#$currentDir=[System.IO.Directory]::GetCurrentDirectory()
$currLoc=([System.IO.FileInfo]$myinvocation.mycommand.path).Directory.FullName
$loc1="$currLoc\node_modules\transitive-js\build\renderer\renderedsegment.js";
FixInFile $loc1 "'lineJoin':'round'" "'stroke-linecap': styler.compute2('segments', 'stroke-linecap', this)" ",`r`n'lineJoin':'round'" $false

$loc2="$currLoc\node_modules\transitive-js\build\display\canvas-display.js";
$addText="this.ctx.lineJoin = attrs['lineJoin'] || 'miter';"
$searchFor="if (attrs['stroke-dasharray']) {"
FixInFile $loc2 $addText $searchFor "$addText`r`n" $true
