$port = 8080
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
$listener.Start()

$ip = ""
$adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -match "Wi-Fi|Ethernet|WLAN" -and $_.IPAddress -notmatch "^169\.254" -and $_.IPAddress -notmatch "^127\." }
if ($adapters) {
    if ($adapters.Count -gt 1) {
        $ip = $adapters[0].IPAddress
    } else {
        $ip = $adapters.IPAddress
    }
} else {
    $ip = "127.0.0.1"
}

Write-Host "==============================================="
Write-Host "Lights Out Server Running!"
Write-Host "Connect your phone to the same WiFi network and visit:"
Write-Host "http://$ip`:$port/"
Write-Host "==============================================="
Write-Host "Press Ctrl+C to stop the server."

while ($true) {
    if ($listener.Pending()) {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = [System.IO.StreamReader]::new($stream)
        
        $req = $reader.ReadLine()
        
        if ($req -and $req -match 'GET (.*?) HTTP') {
            # Read rest of headers to clear buffer
            while($reader.ReadLine() -ne "") { }

            $path = $matches[1].Split('?')[0].TrimStart('/')
            if ($path -eq '') { $path = 'index.html' }
            
            $file = Join-Path (Get-Location) $path
            
            $writer = [System.IO.StreamWriter]::new($stream)
            if (Test-Path $file -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($file)
                $type = switch ($ext) {
                    '.html' { 'text/html; charset=utf-8' }
                    '.css'  { 'text/css; charset=utf-8' }
                    '.js'   { 'application/javascript; charset=utf-8' }
                    default { 'text/plain' }
                }
                
                $writer.WriteLine("HTTP/1.1 200 OK")
                $writer.WriteLine("Content-Type: $type")
                $writer.WriteLine("Connection: close")
                
                $bytes = [System.IO.File]::ReadAllBytes($file)
                $writer.WriteLine("Content-Length: $($bytes.Length)")
                $writer.WriteLine("")
                $writer.Flush()
                
                $stream.Write($bytes, 0, $bytes.Length)
            } else {
                $writer.WriteLine("HTTP/1.1 404 Not Found")
                $writer.WriteLine("Connection: close")
                $writer.WriteLine("")
                $writer.WriteLine("File not found.")
                $writer.Flush()
            }
        }
        $client.Close()
    } else {
        Start-Sleep -Milliseconds 50
    }
}
