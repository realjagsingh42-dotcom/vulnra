"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Server,
  Wrench,
  ArrowUpCircle,
  Bot,
} from 'lucide-react'

interface Vulnerability {
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
}

interface ScanResult {
  server_url: string
  status: string
  tools_found: number
  risk_score: number
  overall_severity: string
  scan_duration: number
  tier?: string
  vulnerabilities: Vulnerability[]
}

interface MCPScanResultsProps {
  result: ScanResult
}

export default function MCPScanResults({ result }: MCPScanResultsProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-600'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getBorderColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'border-l-red-500'
      case 'high': return 'border-l-orange-500'
      case 'medium': return 'border-l-yellow-400'
      case 'low': return 'border-l-blue-400'
      default: return 'border-l-v-border'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return <XCircle className="w-4 h-4 text-red-600" />
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-500" />
      case 'medium': return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'low': return <CheckCircle className="w-4 h-4 text-blue-500" />
      default: return <Shield className="w-4 h-4 text-gray-500" />
    }
  }

  const agenticVulns = result.vulnerabilities.filter(v => v.agentic_category)
  const owaspVulns = result.vulnerabilities.filter(v => v.owasp_category)
  const mitreMapped = result.vulnerabilities.filter(v => v.mitre_technique)

  return (
    <Card className="mt-6 bg-v-bg2 border-v-border2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-v-text1">
              <Server className="w-5 h-5 text-acid" />
              Scan Results
            </CardTitle>
            <CardDescription className="text-v-muted2">
              {result.server_url} &bull; {result.scan_duration.toFixed(2)}s &bull; {result.tools_found} tools found
              {result.tier && (
                <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-acid/70">
                  [{result.tier}]
                </span>
              )}
            </CardDescription>
          </div>
          <Badge className={`${getSeverityColor(result.overall_severity)} text-white`}>
            {result.overall_severity.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-v-bg1 border border-v-border2">
            <TabsTrigger value="overview" className="data-[state=active]:bg-acid data-[state=active]:text-black">Overview</TabsTrigger>
            <TabsTrigger value="vulnerabilities" className="data-[state=active]:bg-acid data-[state=active]:text-black">
              Vulnerabilities
              {result.vulnerabilities.length > 0 && (
                <span className="ml-1.5 text-[10px] font-bold opacity-70">({result.vulnerabilities.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tools" className="data-[state=active]:bg-acid data-[state=active]:text-black">Tools ({result.tools_found})</TabsTrigger>
            <TabsTrigger value="compliance" className="data-[state=active]:bg-acid data-[state=active]:text-black">Compliance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-v-bg1 border-v-border2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-v-text1">Risk Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Progress value={result.risk_score} className="flex-1" />
                    <span className="font-bold text-v-text1">{result.risk_score.toFixed(1)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-v-bg1 border-v-border2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-v-text1">Tools Found</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-acid" />
                    <span className="font-bold text-v-text1">{result.tools_found}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-v-bg1 border-v-border2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-v-text1">Vulnerabilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(result.overall_severity)}
                    <span className="font-bold text-v-text1">{result.vulnerabilities.length}</span>
                    {agenticVulns.length > 0 && (
                      <span className="text-[10px] font-mono text-acid/70 ml-1">
                        {agenticVulns.length} agentic
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {result.vulnerabilities.length === 0 ? (
              <Alert className="bg-green-900/20 border-green-800">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <AlertTitle className="text-green-400">No Vulnerabilities Found</AlertTitle>
                <AlertDescription className="text-green-300">
                  The agent infrastructure appears secure — no vulnerabilities detected across all probes.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-red-900/20 border-red-800">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <AlertTitle className="text-red-400">Vulnerabilities Detected</AlertTitle>
                <AlertDescription className="text-red-300">
                  {result.vulnerabilities.length} security issue{result.vulnerabilities.length !== 1 ? 's' : ''} found
                  {agenticVulns.length > 0 && ` (${agenticVulns.length} OWASP Agentic Top 10)`}.
                  Review the Vulnerabilities tab for details.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Vulnerabilities Tab */}
          <TabsContent value="vulnerabilities" className="mt-6">
            <div className="space-y-4">
              {result.vulnerabilities.length === 0 && (
                <p className="text-sm text-v-muted2 text-center py-8">No vulnerabilities found.</p>
              )}
              {result.vulnerabilities.map((vuln) => (
                <Card key={vuln.id} className={`border-l-4 ${getBorderColor(vuln.severity)} bg-v-bg1 border-v-border2`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base text-v-text1 leading-snug">{vuln.name}</CardTitle>
                        <CardDescription className="mt-1 text-v-muted2">{vuln.description}</CardDescription>
                      </div>
                      <Badge className={`${getSeverityColor(vuln.severity)} text-white shrink-0`}>
                        {vuln.severity}
                      </Badge>
                    </div>
                    {/* Category badges */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {vuln.agentic_category && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-acid/10 border border-acid/20 text-acid font-mono text-[10px] tracking-wider">
                          <Bot className="w-2.5 h-2.5" />
                          {vuln.agentic_category}
                        </span>
                      )}
                      {vuln.owasp_category && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-purple-900/30 border border-purple-500/20 text-purple-300 font-mono text-[10px] tracking-wider">
                          {vuln.owasp_category}
                        </span>
                      )}
                      {vuln.mitre_technique && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-blue-900/20 border border-blue-500/20 text-blue-300 font-mono text-[10px] tracking-wider">
                          {vuln.mitre_technique}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm text-v-text1 mb-4">
                      <div>
                        <span className="font-medium text-v-muted2">CVSS Score: </span>
                        <span className="font-mono">{vuln.cvss_score}</span>
                      </div>
                      <div>
                        <span className="font-medium text-v-muted2">Vuln ID: </span>
                        <span className="font-mono text-xs">{vuln.id}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-v-bg2 rounded border border-v-border2">
                      <p className="font-medium text-xs text-v-muted2 uppercase tracking-wider mb-1">Remediation</p>
                      <p className="text-sm text-v-text1">{vuln.remediation}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="mt-6">
            <Alert className="bg-v-bg1 border-v-border2">
              <Wrench className="w-4 h-4 text-acid" />
              <AlertTitle className="text-v-text1">Tool Enumeration</AlertTitle>
              <AlertDescription className="text-v-muted2">
                Found {result.tools_found} tool{result.tools_found !== 1 ? 's' : ''} on the MCP server.
                Review the Vulnerabilities tab for security issues tied to specific tools.
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="mt-6">
            <div className="space-y-4">

              {/* OWASP Agentic Top 10 */}
              <Card className="bg-v-bg1 border-v-border2">
                <CardHeader>
                  <CardTitle className="text-base text-v-text1 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-acid" />
                    OWASP Agentic Top 10
                  </CardTitle>
                  <CardDescription className="text-v-muted2">
                    Agentic vulnerability findings mapped to the OWASP Agentic Top 10 (2025)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {agenticVulns.length === 0 ? (
                    <p className="text-xs text-v-muted2">No agentic findings. Run a Pro or Enterprise scan for full OWASP Agentic Top 10 coverage.</p>
                  ) : (
                    <div className="space-y-2">
                      {agenticVulns.map((vuln, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-v-text1">
                          <span className="font-mono text-[10px] text-acid bg-acid/10 border border-acid/20 px-1.5 py-0.5 rounded-sm">
                            {vuln.agentic_category}
                          </span>
                          <span className="text-v-muted2">{vuln.name}</span>
                          <Badge className={`${getSeverityColor(vuln.severity)} text-white text-[9px] py-0 ml-auto`}>
                            {vuln.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* OWASP LLM Top 10 */}
              <Card className="bg-v-bg1 border-v-border2">
                <CardHeader>
                  <CardTitle className="text-base text-v-text1 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400" />
                    OWASP LLM Top 10
                  </CardTitle>
                  <CardDescription className="text-v-muted2">
                    Mapping of vulnerabilities to OWASP LLM security categories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {owaspVulns.length === 0 ? (
                    <p className="text-xs text-v-muted2">No OWASP LLM categories mapped.</p>
                  ) : (
                    <div className="space-y-2">
                      {owaspVulns.map((vuln, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-v-text1">
                          <CheckCircle className="w-3.5 h-3.5 text-acid shrink-0" />
                          <span className="text-v-muted2">{vuln.owasp_category}</span>
                          <span className="text-v-text1 text-xs ml-1 truncate">{vuln.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* MITRE ATLAS */}
              <Card className="bg-v-bg1 border-v-border2">
                <CardHeader>
                  <CardTitle className="text-base text-v-text1 flex items-center gap-2">
                    <ArrowUpCircle className="w-4 h-4 text-blue-400" />
                    MITRE ATLAS
                  </CardTitle>
                  <CardDescription className="text-v-muted2">
                    Mapping of vulnerabilities to MITRE ATLAS techniques
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mitreMapped.length === 0 ? (
                    <p className="text-xs text-v-muted2">No MITRE ATLAS techniques mapped.</p>
                  ) : (
                    <div className="space-y-2">
                      {mitreMapped.map((vuln, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-v-text1">
                          <span className="font-mono text-[10px] text-blue-300 bg-blue-900/20 border border-blue-500/20 px-1.5 py-0.5 rounded-sm">
                            {vuln.mitre_technique}
                          </span>
                          <span className="text-v-muted2 text-xs">{vuln.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
