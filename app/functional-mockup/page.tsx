"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CitationModal } from "@/components/citation-modal"
import { Checkbox } from "@/components/ui/checkbox"
import dynamic from "next/dynamic"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import { 
  FileText, 
  Send, 
  BookOpen, 
  Quote, 
  User,
  Bot,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  Folder,
  FolderOpen,
  MessageSquare,
  MoreVertical
} from "lucide-react"

const PDFViewer = dynamic(
  () => import("@/components/pdf-viewer").then(mod => mod.PDFViewer),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full">Loading PDF viewer...</div>
  }
)

interface SelectedFile {
  documentId: string;
  agency: string;
  title: string;
}

interface Citation {
  location: {
    s3Location: {
      uri: string;
    };
  };
  generatedResponsePart: {
    textResponsePart: {
      text: string;
    };
  };
  source_number?: number;
  document_id?: string;
  title?: string;
  agency?: string;
  page_numbers?: number[];
  relevance_score?: number;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Citation[];
}

interface DocumentTreeNode {
  name: string;
  type: 'agency' | 'document';
  children?: DocumentTreeNode[];
  documentId?: string;
  status?: 'ready' | 'processing';
  pages?: number;
  indexed_in_kb?: boolean;
}

function FunctionalMockupContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const documentId = searchParams.get('doc')
  // const agency = searchParams.get('agency') // Unused in current implementation
  const initialPage = searchParams.get('page')
  
  // State from original functional page
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [query, setQuery] = useState('')
  const [citations, setCitations] = useState<Citation[]>([])
  const [llmResponse, setLlmResponse] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documentTree, setDocumentTree] = useState<DocumentTreeNode[]>([])
  
  // New state for mockup UI
  const [selectedDocument, setSelectedDocument] = useState<string | null>(documentId)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('chat')
  
  // Build document server URL if we have a document ID
  const documentUrl = selectedDocument 
    ? `${process.env.NEXT_PUBLIC_DOCUMENT_SERVER_URL || 'https://xim3ozqibklhc6hz5uln4afiba0hprrn.lambda-url.ap-southeast-2.on.aws/'}${selectedDocument}`
    : null

  // Load document tree on mount
  useEffect(() => {
    const loadDocumentTree = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_DOCUMENTS_API_URL || 'https://7hixztmew2qha5brfzg4zqu7nq0ccadh.lambda-url.ap-southeast-2.on.aws/'
        const response = await fetch(apiUrl)
        if (response.ok) {
          const data = await response.json()
          // Convert object format to array format for our tree structure
          const agenciesArray = Object.keys(data.agencies || {}).map(agencyName => ({
            name: agencyName,
            type: 'agency' as const,
            children: (data.agencies[agencyName]?.documents || []).map((doc: { id: string; title: string; status: string; indexed_in_kb: boolean }) => ({
              name: doc.title,
              type: 'document' as const,
              documentId: doc.id,
              status: doc.status === 'processed' ? 'ready' : 'processing',
              indexed_in_kb: doc.indexed_in_kb,
              pages: undefined // Not available in current API
            }))
          }))
          setDocumentTree(agenciesArray)
          // Auto-expand agencies that have documents
          const agenciesWithDocs = agenciesArray.filter((a) => a.children?.length > 0).map((a) => a.name)
          setExpandedAgencies(new Set(agenciesWithDocs.slice(0, 2))) // Expand first 2 agencies
        }
      } catch (error) {
        console.error('Failed to load document tree:', error)
      }
    }
    loadDocumentTree()
  }, [])

  // Update selected document when URL changes
  useEffect(() => {
    if (documentId) {
      setSelectedDocument(documentId)
    }
  }, [documentId])

  const handleDocumentClick = (doc: DocumentTreeNode, agency: string) => {
    if (doc.documentId && doc.type === 'document') {
      setSelectedDocument(doc.documentId)
      const params = new URLSearchParams()
      params.set('doc', doc.documentId)
      params.set('agency', encodeURIComponent(agency))
      router.push(`/functional-mockup?${params.toString()}`)
    }
  }

  const handleDocumentCheckboxChange = (doc: DocumentTreeNode, agency: string, checked: boolean) => {
    if (doc.documentId && doc.type === 'document') {
      if (checked) {
        setSelectedFiles(prev => [...prev, {
          documentId: doc.documentId!,
          agency: agency,
          title: doc.name
        }])
      } else {
        setSelectedFiles(prev => prev.filter(f => f.documentId !== doc.documentId))
      }
    }
  }

  const handleAgencyToggle = (agencyName: string) => {
    const newExpanded = new Set(expandedAgencies)
    if (newExpanded.has(agencyName)) {
      newExpanded.delete(agencyName)
    } else {
      newExpanded.add(agencyName)
    }
    setExpandedAgencies(newExpanded)
  }

  // const handleSelectionChange = (files: SelectedFile[]) => {
  //   setSelectedFiles(files)
  // } // Unused in current implementation

  const handleCitationClick = (citation: Citation) => {
    const documentId = citation.document_id
    const agency = citation.agency
    const pageNumbers = citation.page_numbers
    
    if (documentId && agency) {
      const params = new URLSearchParams()
      params.set('doc', documentId)
      params.set('agency', agency)
      
      // Navigate to first page if page numbers are available
      if (pageNumbers && pageNumbers.length > 0) {
        params.set('page', pageNumbers[0].toString())
      }
      
      router.push(`/functional-mockup?${params.toString()}`)
      setSelectedDocument(documentId)
    }
  }

  const handleSendMessage = async () => {
    if (!query.trim()) {
      setError('Please enter a query')
      return
    }

    if (selectedFiles.length === 0) {
      setError('Please select at least one document')
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

    setLoading(true)
    setError(null)
    setCitations([])
    setLlmResponse('')

    try {
      const apiUrl = process.env.NEXT_PUBLIC_CHAT_API_URL || 'https://gtgyd2z7zbqjdyqe26fwziq4ue0haagc.lambda-url.ap-southeast-2.on.aws/'
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message: query,
          selected_items: {
            agencies: Array.from(new Set(selectedFiles.map(f => f.agency)))
          },
          session_id: `session-${Date.now()}`
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to submit query: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('text/event-stream') && !contentType?.includes('application/octet-stream')) {
        const data = await response.json()
        setCitations(data.citations || [])
        setLlmResponse(data.answer || '')
        
        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          type: 'assistant',
          content: data.answer || '',
          timestamp: new Date().toISOString(),
          citations: data.citations || []
        }
        setChatMessages(prev => [...prev, assistantMessage])
        return
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        throw new Error('No response stream available')
      }

      let buffer = ''
      let currentEvent = ''
      let streamingResponse = ''
      let streamingCitations: Citation[] = []
      
      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            if (line.trim() === '') {
              currentEvent = ''
              continue
            }
            
            if (line.startsWith('event: ')) {
              currentEvent = line.substring(7).trim()
              continue
            }
            
            if (line.startsWith('data: ')) {
              const data = line.substring(6).trim()
              
              try {
                const parsed = JSON.parse(data)
                
                if (currentEvent === 'citations' || (parsed.citations && Array.isArray(parsed.citations))) {
                  streamingCitations = parsed.citations || []
                  setCitations(streamingCitations)
                  // Show citations tab when citations arrive
                  if (streamingCitations.length > 0) {
                    setActiveTab('citations')
                  }
                } else if (currentEvent === 'delta' || parsed.text) {
                  const newText = parsed.text || ''
                  streamingResponse += newText
                  setLlmResponse(streamingResponse)
                  // Switch back to chat tab when response starts
                  if (newText && activeTab === 'citations') {
                    setActiveTab('chat')
                  }
                } else if (currentEvent === 'error' || parsed.message) {
                  throw new Error(parsed.message || 'Stream error')
                } else if (currentEvent === 'end' || parsed.done) {
                  // Add complete assistant message
                  const assistantMessage: ChatMessage = {
                    id: `msg-${Date.now() + 1}`,
                    type: 'assistant',
                    content: streamingResponse,
                    timestamp: new Date().toISOString(),
                    citations: streamingCitations
                  }
                  setChatMessages(prev => [...prev, assistantMessage])
                  return
                }
              } catch (parseError) {
                console.debug('Skipping invalid JSON:', data, parseError)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

    } catch (err) {
      console.error('Failed to submit query:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit query')
    } finally {
      setLoading(false)
      setQuery('') // Clear input after sending
    }
  }

  const getSelectedDocumentInfo = () => {
    if (!selectedDocument || !Array.isArray(documentTree)) return null
    
    for (const agency of documentTree) {
      if (agency.children) {
        for (const doc of agency.children) {
          if (doc.documentId === selectedDocument) {
            return { document: doc, agency: agency.name }
          }
        }
      }
    }
    return null
  }

  const selectedDocInfo = getSelectedDocumentInfo()
  const totalDocuments = Array.isArray(documentTree) 
    ? documentTree.reduce((acc, agency) => acc + (agency.children?.length || 0), 0)
    : 0
  const selectedAgencies = Array.from(new Set(selectedFiles.map(f => f.agency)))

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          <h1 className="font-semibold">AskPolicy</h1>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>{selectedAgencies.length} agencies selected</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary">
            {totalDocuments} documents
          </Badge>
        </div>
      </header>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* File Browser Panel */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2 mb-3">
                <Folder className="h-4 w-4" />
                <h2 className="font-semibold text-sm">Document Browser</h2>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  className="pl-8 h-9"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {Array.isArray(documentTree) && documentTree.map((agency) => (
                  <div key={agency.name} className="space-y-2">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => handleAgencyToggle(agency.name)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedAgencies.has(agency.name) ? (
                          <FolderOpen className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Folder className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">{agency.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {agency.children?.length || 0}
                      </Badge>
                    </div>
                    
                    {expandedAgencies.has(agency.name) && agency.children && (
                      <div className="ml-6 space-y-1">
                        {agency.children.map((doc) => {
                          const isSelected = selectedFiles.some(f => f.documentId === doc.documentId)
                          const isViewing = selectedDocument === doc.documentId
                          return (
                          <div
                            key={doc.documentId || doc.name}
                            className={`flex items-center gap-2 p-2 rounded-md text-xs transition-colors ${
                              isViewing
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleDocumentCheckboxChange(doc, agency.name, checked as boolean)}
                              className="h-3 w-3"
                            />
                            <FileText className="h-3 w-3" />
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => handleDocumentClick(doc, agency.name)}
                            >
                              <div className="truncate font-medium hover:underline">{doc.name}</div>
                              {doc.pages && (
                                <div className="text-muted-foreground">{doc.pages} pages</div>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              {doc.indexed_in_kb ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <Clock className="h-3 w-3 text-orange-500" />
                              )}
                            </div>
                          </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )) || null}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* PDF Viewer Panel */}
        <ResizablePanel defaultSize={40} minSize={30}>
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">
                    {selectedDocInfo ? selectedDocInfo.document.name : "Select a document"}
                  </h3>
                  {selectedDocInfo && (
                    <p className="text-xs text-muted-foreground">
                      {selectedDocInfo.agency} • Page {initialPage || 1} of {selectedDocInfo.document.pages || '?'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              {documentUrl ? (
                <PDFViewer 
                  filePath={documentUrl} 
                  initialPage={initialPage ? parseInt(initialPage) : undefined}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-center text-muted-foreground bg-muted/30">
                  <div>
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a document from the browser to view</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Chat & Citations Panel */}
        <ResizablePanel defaultSize={40} minSize={30}>
          <div className="flex flex-col h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <div className="border-b px-4 pt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="chat" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="citations" className="flex items-center gap-2">
                    <Quote className="h-4 w-4" />
                    Citations ({citations.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="chat" className="h-full flex flex-col m-0 data-[state=active]:flex">
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full p-4">
                      <div className="space-y-4">
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
                        <CardContent className="p-4">
                          <div className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </div>
                          
                          {message.citations && message.citations.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <div className="text-xs text-muted-foreground mb-2">
                                Sources ({message.citations.length}):
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {message.citations.map((citation, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {citation.document_id || citation.location.s3Location.uri.split('/').pop()?.replace('.pdf', '') || 'Unknown'}
                                    {citation.page_numbers && citation.page_numbers.length > 0 && (
                                      <span> (p.{citation.page_numbers[0]})</span>
                                    )}
                                  </Badge>
                                ))}
                              </div>
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
                  
                  {loading && (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback>
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <Card className="max-w-[80%] bg-muted/50">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Analyzing documents...</div>
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
                        <CardContent className="p-4">
                          <div className="text-sm whitespace-pre-wrap">
                            {llmResponse}
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
                        placeholder="Ask about mental health policies..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !loading && handleSendMessage()}
                        disabled={loading}
                      />
                      <Button
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={!query.trim() || loading || selectedFiles.length === 0}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Filter className="h-3 w-3" />
                      <span>Searching across {selectedAgencies.length} selected agencies</span>
                    </div>

                    {/* Error Display */}
                    {error && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-xs">
                        {error}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="citations" className="h-full m-0 data-[state=active]:flex">
                  <ScrollArea className="h-full p-4">
                    {citations.length > 0 ? (
                      <div className="space-y-3">
                    {citations.map((citation, index) => (
                      <CitationModal key={index} citation={citation} index={index} onViewInDocument={handleCitationClick}>
                        <Card className="border hover:bg-muted/30 transition-colors cursor-pointer">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <CardTitle className="text-sm font-medium">
                                  {citation.title || citation.document_id || citation.location.s3Location.uri.split('/').pop()?.replace('.pdf', '') || 'Unknown'}
                                </CardTitle>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{citation.agency || 'Unknown Agency'}</span>
                                  <Separator orientation="vertical" className="h-3" />
                                  <span>
                                    {citation.page_numbers && citation.page_numbers.length > 0 
                                      ? `Page ${citation.page_numbers.join(', ')}`
                                      : 'Page unknown'
                                    }
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {citation.relevance_score && (
                                  <Badge variant="secondary" className="text-xs">
                                    {Math.round(citation.relevance_score * 100)}% match
                                  </Badge>
                                )}
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              &ldquo;{citation.generatedResponsePart.textResponsePart.text.slice(0, 200)}{citation.generatedResponsePart.textResponsePart.text.length > 200 ? '...' : ''}&rdquo;
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCitationClick(citation)
                                }}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View in document
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs">
                                <Quote className="h-3 w-3 mr-1" />
                                Copy citation
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </CitationModal>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                        <div>
                          <Quote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Citations will appear here after you submit a query</p>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

export default function FunctionalMockupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FunctionalMockupContent />
    </Suspense>
  )
}