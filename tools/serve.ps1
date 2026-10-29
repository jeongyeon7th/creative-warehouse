# 소재창고 로컬 테스트 서버 (Windows PowerShell 기본 기능만 사용, 설치 불필요)
# 사용법:  powershell -ExecutionPolicy Bypass -File tools\serve.ps1            → http://localhost:8765/
#          powershell -ExecutionPolicy Bypass -File tools\serve.ps1 -Port 9000
# localhost는 브라우저가 ‘보안 환경’으로 취급하므로 서비스 워커·설치 기능을 시험할 수 있다.
# 이 파일은 배포에 필요하지 않다(정적 호스팅에 올릴 때 tools 폴더는 빼도 된다).
param([string]$Root = (Join-Path $PSScriptRoot '..'), [int]$Port = 8765)
$Root = (Resolve-Path $Root).Path
$types = @{
  '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'; '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.png' = 'image/png'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'; '.txt' = 'text/plain; charset=utf-8'; '.md' = 'text/plain; charset=utf-8'
}
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "소재창고: http://localhost:$Port/  (중지: Ctrl+C)"
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
      $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if ($rel -eq '' -or $rel.EndsWith('/')) { $rel += 'index.html' }
      $file = [IO.Path]::GetFullPath((Join-Path $Root $rel))
      if ($file.StartsWith($Root) -and (Test-Path $file -PathType Leaf)) {
        $bytes = [IO.File]::ReadAllBytes($file)
        $ext = [IO.Path]::GetExtension($file).ToLower()
        $res.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' })
        $res.Headers.Add('Cache-Control', 'no-cache')
        $res.ContentLength64 = $bytes.Length
        if ($ctx.Request.HttpMethod -ne 'HEAD') { $res.OutputStream.Write($bytes, 0, $bytes.Length) }
      } else { $res.StatusCode = 404 }
    } catch { Write-Host "요청 처리 오류: $_" }
    try { $res.Close() } catch {}
  }
} finally { $listener.Stop() }
