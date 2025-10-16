"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, History, FileText, MessageSquare, Send, Bot, User, RotateCcw } from "lucide-react"
import Image from "next/image"
import dynamic from "next/dynamic"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// Import version data with full text
import versionData from "@/data/pdf-versions-with-text.json"
import { useDiffChat } from "@/hooks/useDiffChat"

const PDFViewer = dynamic(
  () => import("@/components/pdf-viewer").then(mod => mod.PDFViewer),
  {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full">Loading PDF viewer...</div>
  }
)

// History server Lambda URL - generates fresh presigned URLs or serves PDFs directly
const HISTORY_SERVER_URL = process.env.NEXT_PUBLIC_HISTORY_SERVER_URL || 'https://7efcvnqehvpm2qhkl23c45ic540huhgk.lambda-url.ap-southeast-2.on.aws/'

// Version metadata with sizes (from reference guide)
const VERSION_SIZES: Record<string, number> = {
  "VPM_Workplace_flexibility-1810.pdf": 375,
  "VPM_Workplace_flexibility-1910.pdf": 392,
  "VPM_Workplace_flexibility-2010.pdf": 650,
  "VPM_Workplace_flexibility-2107.pdf": 705,
  "VPM_Workplace_flexibility-2207.pdf": 591,
  "VPM_Workplace_flexibility-latest.pdf": 686,
}

interface Version {
  id: number
  version: string
  filename: string
  url: string
  size: number
}

interface VersionWithText {
  id: number
  version: string
  filename: string
  fullText: string
  textLength: number
}

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: string
}

function HistoryPageContent() {
  const router = useRouter()
  const { sendMessage, response: llmResponse, isLoading, error: chatError } = useDiffChat()

  // Build versions with Lambda URLs (memoized to prevent infinite loops)
  const versions: Version[] = useMemo(() => versionData.versions.map(v => ({
    ...v,
    url: `${HISTORY_SERVER_URL}${v.filename}`,
    size: VERSION_SIZES[v.filename] || 0
  })), [])

  const [selectedVersionId, setSelectedVersionId] = useState<number>(6) // Default to latest
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'chat'>('summary')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loadingPdf, setLoadingPdf] = useState(false)

  const selectedVersion = versions.find(v => v.id === selectedVersionId)

  // Fetch presigned URL when selected version ID changes
  useEffect(() => {
    if (!selectedVersionId) {
      setPdfUrl(null)
      return
    }

    const version = versions.find(v => v.id === selectedVersionId)
    if (!version) {
      setPdfUrl(null)
      return
    }

    const fetchPresignedUrl = async () => {
      setLoadingPdf(true)
      try {
        const response = await fetch(version.url)
        if (!response.ok) {
          throw new Error(`Failed to fetch presigned URL: ${response.status}`)
        }
        const data = await response.json()
        setPdfUrl(data.url)
      } catch (err) {
        console.error('Error fetching presigned URL:', err)
        setError(err instanceof Error ? err.message : 'Failed to load PDF')
      } finally {
        setLoadingPdf(false)
      }
    }

    fetchPresignedUrl()
  }, [selectedVersionId, versions])

  // Find summary for the selected version (changes from previous version)
  const getVersionSummary = () => {
    if (!selectedVersionId || selectedVersionId === 1) return null // No summary for first version

    return versionData.summaries.find(
      s => s.newVersion === selectedVersionId
    )
  }

  const summary = getVersionSummary()

  const handleNewChat = () => {
    setChatMessages([])
    setError(null)
    setActiveTab('summary')
  }

  const handleSendMessage = async () => {
    if (!query.trim()) {
      setError('Please enter a query')
      return
    }

    if (!selectedVersion) {
      setError('Please select a version')
      return
    }

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: query,
      timestamp: new Date().toISOString()
    }
    setChatMessages(prev => [...prev, userMessage])
    setError(null)
    setActiveTab('chat')

    // Get the full text for the selected version
    const versionWithText = (versionData.versions as VersionWithText[]).find((v) => v.id === selectedVersionId)
    const fullText = versionWithText?.fullText || ''

    // Find the previous version for comparison context
    const previousVersionId = selectedVersionId - 1
    const previousVersion = previousVersionId > 0
      ? (versionData.versions as VersionWithText[]).find((v) => v.id === previousVersionId)
      : null

    // Build comprehensive context prompt
    let contextPrompt = `# Document Context\n\n`
    contextPrompt += `**Document:** Workplace Flexibility Policy\n`
    contextPrompt += `**Agency:** Victoria Police\n`
    contextPrompt += `**Current Version:** ${selectedVersion.version}\n`
    contextPrompt += `**Filename:** ${selectedVersion.filename}\n\n`

    if (summary) {
      contextPrompt += `# Summary of Changes\n\n`
      contextPrompt += `Changes from ${summary.oldVersionName} to ${summary.newVersionName}:\n\n`
      contextPrompt += summary.summary + '\n\n'
    } else {
      contextPrompt += `# Note\n\nThis is the initial version (${selectedVersion.version}) - there is no previous version to compare against.\n\n`
    }

    if (previousVersion) {
      contextPrompt += `# Previous Version (${previousVersion.version})\n\n`
      contextPrompt += `<previous_version>\n${previousVersion.fullText}\n</previous_version>\n\n`
    }

    contextPrompt += `# Current Version (${selectedVersion.version})\n\n`
    contextPrompt += `<current_version>\n${fullText}\n</current_version>\n\n`

    contextPrompt += `---\n\n`
    contextPrompt += `# User Question\n\n${query}\n\n`
    contextPrompt += `Please answer the user's question based on the context provided above. Focus on the specific changes, additions, or deletions between the versions if relevant.`

    setQuery('') // Clear input immediately after sending

    try {
      // Send message with full context prepended
      await sendMessage(
        contextPrompt,
        {
          documentTitle: 'Workplace Flexibility Policy',
          agency: 'Victoria Police',
          currentVersion: selectedVersion.version,
          previousVersion: previousVersion?.version,
        },
        undefined,
        (fullResponse) => {
          // Add the complete assistant message when streaming finishes
          const assistantMessage: ChatMessage = {
            id: `msg-${Date.now() + 1}`,
            type: 'assistant',
            content: fullResponse,
            timestamp: new Date().toISOString()
          }
          setChatMessages(prev => [...prev, assistantMessage])
        }
      )
    } catch (err) {
      console.error('Failed to submit query:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit query')
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Version Selection Bar */}
      <div className="border-b bg-background px-6 py-3">
        <div className="flex items-center gap-4 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Image
              src="/360_bulb_logo.png"
              alt="360 Logo"
              width={24}
              height={24}
              className="rounded-full"
            />
            <h1 className="font-semibold text-sm">AskPolicy</h1>
          </div>

          <div className="h-5 w-px bg-border"></div>

          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold text-sm">Workplace Flexibility Policy - Version History</h2>
              <p className="text-xs text-muted-foreground">Victoria Police • Click any version to view changes</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-border"></div>

          {/* Version nodes */}
          <div className="relative flex justify-between items-start">
            {versions.map((version) => {
              const isSelected = version.id === selectedVersionId

              return (
                <div key={version.id} className="flex flex-col items-center flex-1">
                  {/* Timeline node */}
                  <button
                    onClick={() => setSelectedVersionId(version.id)}
                    className={`
                      relative z-10 w-10 h-10 rounded-full border-3
                      transition-all duration-200 hover:scale-110
                      ${isSelected
                        ? 'bg-primary border-primary shadow-lg'
                        : 'bg-background border-border hover:border-primary/50'
                      }
                    `}
                    title={`View ${version.version}`}
                  >
                    <div className={`flex items-center justify-center h-full ${isSelected ? 'text-white' : 'text-muted-foreground'}`}>
                      <FileText className="h-4 w-4" />
                    </div>
                  </button>

                  {/* Version label */}
                  <div className="mt-2 text-center min-w-[80px]">
                    <div className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {version.version}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {version.size} KB
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* PDF Viewer Panel */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="flex flex-col h-full">
            <div className="px-4 py-2 border-b">
              <h3 className="font-semibold text-sm">
                {selectedVersion ? `${selectedVersion.version} - ${selectedVersion.filename}` : "No version selected"}
              </h3>
            </div>

            <div className="flex-1 overflow-hidden">
              {loadingPdf ? (
                <div className="flex items-center justify-center h-full text-center text-muted-foreground bg-muted/30">
                  <div>
                    <Progress value={undefined} className="w-48 h-2 mb-4" />
                    <p>Loading PDF...</p>
                  </div>
                </div>
              ) : pdfUrl ? (
                <PDFViewer filePath={pdfUrl} />
              ) : selectedVersion ? (
                <div className="flex items-center justify-center h-full text-center text-muted-foreground bg-muted/30">
                  <div>
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Failed to load PDF</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-center text-muted-foreground bg-muted/30">
                  <div>
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a version to view</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Changes & Chat Panel */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="flex flex-col h-full">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'summary' | 'chat')} className="flex flex-col h-full">
              <div className="border-b px-4 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <TabsList className="grid grid-cols-2 flex-1">
                    <TabsTrigger value="summary" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Summary
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Chat
                    </TabsTrigger>
                  </TabsList>
                  {chatMessages.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNewChat}
                      className="ml-2 h-9"
                      title="Start a new chat"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      New Chat
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="summary" className="h-full m-0 data-[state=active]:flex">
                  <div className="flex-1 overflow-auto p-4">
                    {summary ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">
                            Changes from {summary.oldVersionName} to {summary.newVersionName}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xs text-muted-foreground mb-4">
                            Analysis generated using {versionData.model}
                          </div>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {summary.summary}
                            </ReactMarkdown>
                          </div>
                        </CardContent>
                      </Card>
                    ) : selectedVersionId === 1 ? (
                      <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                        <Card className="border-2 border-dashed max-w-md">
                          <CardContent className="pt-6">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-sm font-semibold mb-2">First Version</p>
                            <p className="text-xs">
                              This is the initial version of the policy (October 2018). There are no previous changes to display.
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                        <Card className="border-2 border-dashed max-w-md">
                          <CardContent className="pt-6">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-sm font-semibold mb-2">Change Analysis</p>
                            <p className="text-xs mb-4">
                              Select a version from the timeline above to see what changed in that update.
                            </p>
                            <div className="text-xs text-left space-y-1">
                              <p className="font-semibold">Available for each version:</p>
                              <ul className="list-disc list-inside ml-2 space-y-1">
                                <li>AI-powered change summaries</li>
                                <li>Key policy modifications</li>
                                <li>Procedural updates</li>
                                <li>Legislative changes</li>
                              </ul>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="chat" className="h-full flex flex-col m-0 data-[state=active]:flex">
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full p-2">
                      <div className="space-y-2">
                        {chatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex gap-3 ${
                              message.type === "user" ? "justify-end" : "justify-start"
                            }`}
                          >
                            {message.type === "assistant" && (
                              <Avatar className="h-8 w-8 mt-1">
                                <AvatarFallback>
                                  <Bot className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                            )}

                            <Card className={`max-w-[80%] ${
                              message.type === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/50"
                            }`}>
                              <CardContent className={message.type === "assistant" ? "p-3" : "px-3 py-2"}>
                                {message.type === "assistant" ? (
                                  <div className="prose prose-sm max-w-none dark:prose-invert">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {message.content}
                                    </ReactMarkdown>
                                  </div>
                                ) : (
                                  <div className="text-sm whitespace-pre-wrap">
                                    {message.content}
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {message.type === "user" && (
                              <Avatar className="h-8 w-8 mt-1">
                                <AvatarFallback>
                                  <User className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        ))}

                        {isLoading && (
                          <div className="flex gap-3">
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarFallback>
                                <Bot className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <Card className="max-w-[80%] bg-muted/50">
                              <CardContent className="p-2">
                                <div className="space-y-0">
                                  <div className="text-sm text-muted-foreground">Analyzing version...</div>
                                  <Progress value={undefined} className="h-1" />
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {/* Show streaming response if available */}
                        {llmResponse && !chatMessages.find(m => m.content === llmResponse) && (
                          <div className="flex gap-3">
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarFallback>
                                <Bot className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <Card className="max-w-[80%] bg-muted/50">
                              <CardContent className="p-3">
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {llmResponse}
                                  </ReactMarkdown>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Chat Input */}
                  <div className="border-t p-4 bg-background">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ask about this version's changes..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSendMessage()}
                        disabled={isLoading}
                      />
                      <Button
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={!query.trim() || isLoading || !selectedVersion}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      <span>
                        Chat about {selectedVersion?.version}
                        {summary && ` (${summary.oldVersionName} → ${summary.newVersionName})`}
                      </span>
                    </div>

                    {/* Error Display */}
                    {(error || chatError) && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-xs">
                        {error || chatError}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HistoryPageContent />
    </Suspense>
  )
}
