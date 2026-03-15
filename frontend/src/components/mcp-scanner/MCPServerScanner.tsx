"use client"

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Shield, AlertTriangle, CheckCircle, XCircle, Server, LogOut } from 'lucide-react'
import MCPScanResults from './MCPScanResults'
import { signOut } from '@/app/auth/actions'
import { createClient } from '@/utils/supabase/client'

interface MCPServerScannerProps {
  user: User
}

interface ScanResult {
  server_url: string
  status: string
  tools_found: number
  risk_score: number
  overall_severity: string
  scan_duration: number
  tier: string
  vulnerabilities: Array<{
    id: string
    name: string
    description: string
    severity: string
    cvss_score: number
    owasp_category?: string
    agentic_category?: string
    mitre_technique?: string
    evidence: Record<string, any>
    remediation: string
  }>
}

export default function MCPServerScanner({ user }: MCPServerScannerProps) {
  const [serverUrl, setServerUrl] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleScan = async () => {
    if (!serverUrl.trim()) {
      setError('Please enter an MCP server URL')
      return
    }

    setIsScanning(true)
    setError(null)
    setScanResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/scan/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ server_url: serverUrl })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.error || 'Scan failed')
      }

      const data = await response.json()
      setScanResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during scan')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="min-h-screen bg-v-bg1 text-v-text1">
      {/* Top Navigation Bar */}
      <nav className="h-12 bg-v-bg2 border-b border-v-border2 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-acid" />
          <span className="text-sm font-medium">VULNRA Agent Security</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-v-muted2">
            User: {user.email}
          </span>
          <button 
            onClick={() => signOut()}
            className="w-7.5 h-7.5 rounded-sm border border-v-border2 flex items-center justify-center text-v-muted2 hover:text-v-red hover:border-v-red/30 hover:bg-v-red/5 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Server className="w-6 h-6 text-acid" />
            Agent Security
          </h1>
          <p className="text-v-muted2 text-sm">
            Scan AI agent infrastructure and MCP servers for OWASP Agentic Top 10 vulnerabilities —
            goal hijacking, tool misuse, supply chain attacks, code execution, memory poisoning, and more.
          </p>
        </div>

        <Card className="mb-6 bg-v-bg2 border-v-border2">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-acid" />
              Enter MCP Server URL
            </CardTitle>
            <CardDescription className="text-xs text-v-muted2">
              Provide the URL of the MCP server you want to scan (SSE or HTTP transport)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                type="url"
                placeholder="https://your-mcp-server.com/sse"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="flex-1 bg-v-bg1 border-v-border2 text-v-text1 placeholder:text-v-muted2"
                disabled={isScanning}
              />
              <Button 
                onClick={handleScan} 
                disabled={isScanning || !serverUrl.trim()}
                className="bg-acid text-black hover:bg-acid/90"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  'Scan Server'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-900/20 border-red-800">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <AlertTitle className="text-red-400">Scan Error</AlertTitle>
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {scanResult && <MCPScanResults result={scanResult} />}
      </div>
    </div>
  )
}