"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CitationModal } from "@/components/citation-modal"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useState } from "react"
import dynamic from "next/dynamic"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

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

interface ChatResponse {
  answer: string;
  citations: Citation[];
  session_id: string;
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const documentId = searchParams.get('doc')
  const agency = searchParams.get('agency')
  const initialPage = searchParams.get('page')
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [query, setQuery] = useState('')
  const [citations, setCitations] = useState<Citation[]>([])
  const [llmResponse, setLlmResponse] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Build document server URL if we have a document ID
  const documentUrl = documentId 
    ? `${process.env.NEXT_PUBLIC_DOCUMENT_SERVER_URL || 'https://xim3ozqibklhc6hz5uln4afiba0hprrn.lambda-url.ap-southeast-2.on.aws/'}${documentId}`
    : null
  
  const displayTitle = agency && documentId 
    ? `${decodeURIComponent(agency)} - Document`
    : documentId 
    ? `Document: ${documentId}`
    : 'Select a document'

  const handleSelectionChange = (files: SelectedFile[]) => {
    setSelectedFiles(files)
  }

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
      
      router.push(`/?${params.toString()}`)
    }
  }

  const handleQuerySubmit = async () => {
    if (!query.trim()) {
      setError('Please enter a query')
      return
    }

    if (selectedFiles.length === 0) {
      setError('Please select at least one document')
      return
    }

    setLoading(true)
    setError(null)
    setCitations([])
    setLlmResponse('')

    try {
      // Create URL with query parameters for streaming
      const apiUrl = process.env.NEXT_PUBLIC_CHAT_API_URL || 'https://gtgyd2z7zbqjdyqe26fwziq4ue0haagc.lambda-url.ap-southeast-2.on.aws/'
      
      // Use fetch to POST the query, then immediately create EventSource for streaming
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

      // Check if response is event-stream
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('text/event-stream') && !contentType?.includes('application/octet-stream')) {
        // Fallback to JSON response for non-streaming
        const data: ChatResponse = await response.json()
        setCitations(data.citations || [])
        setLlmResponse(data.answer || '')
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
      
      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.trim() === '') {
              // Empty line indicates end of event
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
                  setCitations(parsed.citations || [])
                } else if (currentEvent === 'delta' || parsed.text) {
                  setLlmResponse(prev => prev + (parsed.text || ''))
                } else if (currentEvent === 'error' || parsed.message) {
                  throw new Error(parsed.message || 'Stream error')
                } else if (currentEvent === 'end' || parsed.done) {
                  // Stream completed
                  return
                } else if (currentEvent === 'start') {
                  // Stream started - could show initial message
                  console.log('Stream started:', parsed.message)
                } else if (currentEvent === 'metadata') {
                  // Metadata received - could show context stats
                  console.log('Metadata:', parsed)
                } else if (currentEvent === 'ping') {
                  // Heartbeat - ignore
                  continue
                }
              } catch (parseError) {
                // Skip invalid JSON lines
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
    }
  }
  
  return (
    <SidebarProvider>
      <AppSidebar onSelectionChange={handleSelectionChange} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">
              {displayTitle}
            </h2>
            {agency && (
              <p className="text-sm text-muted-foreground">
                {decodeURIComponent(agency)}
              </p>
            )}
          </div>
        </header>
        <div className="flex-1 p-4 space-y-4">
          {/* Query Testing Interface */}
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="text-lg font-semibold mb-4">Query Testing</h3>
            
            {/* Selected Files Display */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">
                Selected Files ({selectedFiles.length}):
              </p>
              {selectedFiles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="text-xs bg-blue-50 dark:bg-blue-950 p-2 rounded border">
                      <div className="font-medium">{file.title}</div>
                      <div className="text-muted-foreground">{file.agency}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No files selected</p>
              )}
            </div>

            {/* Query Input */}
            <div className="space-y-3">
              <Input
                placeholder="Enter your query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleQuerySubmit()}
              />
              <Button 
                onClick={handleQuerySubmit} 
                disabled={loading || !query.trim() || selectedFiles.length === 0}
                className="w-full"
              >
                {loading ? 'Querying...' : 'Test Query'}
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* LLM Response Display */}
            {llmResponse && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">AI Response:</h4>
                <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/30">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {llmResponse}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Citations Display */}
            {citations.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Citations ({citations.length}):</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {citations.map((citation, index) => (
                    <div key={index} className="space-y-2">
                      <CitationModal citation={citation} index={index} onViewInDocument={handleCitationClick}>
                        <div className="border rounded p-3 bg-muted/50 hover:bg-muted/70 cursor-pointer transition-colors">
                          <div className="text-sm font-medium mb-1 flex items-center justify-between">
                            <span>
                              Source: {citation.location.s3Location.uri.split('/').pop()?.replace('.pdf', '') || 'Unknown'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Click to expand
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mb-2 truncate">
                            {citation.location.s3Location.uri}
                          </div>
                          {citation.page_numbers && citation.page_numbers.length > 0 && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                              Pages: {citation.page_numbers.join(', ')}
                            </div>
                          )}
                          <div className="text-sm">
                            &quot;{citation.generatedResponsePart.textResponsePart.text.slice(0, 150)}{citation.generatedResponsePart.textResponsePart.text.length > 150 ? '...' : ''}&quot;
                          </div>
                        </div>
                      </CitationModal>
                      {citation.document_id && citation.agency && (
                        <Button
                          onClick={() => handleCitationClick(citation)}
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                        >
                          📄 View in Document
                          {citation.page_numbers && citation.page_numbers.length > 0 && (
                            <span className="ml-1">(Page {citation.page_numbers[0]})</span>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 min-h-96">
            {documentUrl ? (
              <PDFViewer 
                filePath={documentUrl} 
                initialPage={initialPage ? parseInt(initialPage) : undefined}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground border rounded-lg">
                Select a document from the sidebar to view it
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}