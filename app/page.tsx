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
import { useSearchParams } from "next/navigation"
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
}

interface ChatResponse {
  answer: string;
  citations: Citation[];
  session_id: string;
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const documentId = searchParams.get('doc')
  const agency = searchParams.get('agency')
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
      const response = await fetch(process.env.NEXT_PUBLIC_CHAT_API_URL || 'https://ihknhh6c3ukc2kf7krsgzadryq0cbytd.lambda-url.ap-southeast-2.on.aws/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          selected_agencies: Array.from(new Set(selectedFiles.map(f => f.agency))),
          session_id: `test-${Date.now()}`
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to submit query: ${response.status}`)
      }

      const data: ChatResponse = await response.json()
      setCitations(data.citations || [])
      setLlmResponse(data.answer || '')
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
                    <CitationModal key={index} citation={citation} index={index}>
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
                        <div className="text-sm">
                          &quot;{citation.generatedResponsePart.textResponsePart.text.slice(0, 150)}{citation.generatedResponsePart.textResponsePart.text.length > 150 ? '...' : ''}&quot;
                        </div>
                      </div>
                    </CitationModal>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 min-h-96">
            {documentUrl ? (
              <PDFViewer filePath={documentUrl} />
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