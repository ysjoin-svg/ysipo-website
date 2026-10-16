$ErrorActionPreference = 'Stop'

$secure = Read-Host 'Paste the Cloudflare Analytics read-only token (hidden input)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$token = $null
try {
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  if ($token -notmatch '^[A-Za-z0-9_-]{40,100}$') {
    throw 'Invalid token format. Copy the Cloudflare API token and try again.'
  }
  $token | ssh -o BatchMode=yes yongsyu@192.168.0.101 'node /home/yongsyu/ysipo-review/scripts/install-traffic-token-remote.js'
  if ($LASTEXITCODE -ne 0) {
    throw 'SSH transfer failed; server configuration was not confirmed.'
  }
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  $token = $null
  $secure.Dispose()
}
