"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
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

function DashboardContent() {
  const searchParams = useSearchParams()
  const documentId = searchParams.get('doc')
  const agency = searchParams.get('agency')
  
  // Build document server URL if we have a document ID
  const documentUrl = documentId 
    ? `${process.env.NEXT_PUBLIC_DOCUMENT_SERVER_URL || 'https://xim3ozqibklhc6hz5uln4afiba0hprrn.lambda-url.ap-southeast-2.on.aws/'}${documentId}`
    : null
  
  const displayTitle = agency && documentId 
    ? `${decodeURIComponent(agency)} - Document`
    : documentId 
    ? `Document: ${documentId}`
    : 'Select a document'
  
  return (
    <SidebarProvider>
      <AppSidebar />
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
        <div className="flex-1 p-4">
          {documentUrl ? (
            <PDFViewer filePath={documentUrl} />
          ) : (
            <div className="flex items-center justify-center h-[calc(100vh-8rem)] text-muted-foreground">
              Select a document from the sidebar to view it
            </div>
          )}
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