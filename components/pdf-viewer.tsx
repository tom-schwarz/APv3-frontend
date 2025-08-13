"use client"

import { useState, useEffect } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"

// Set worker src dynamically to ensure version compatibility
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`
}

interface PDFViewerProps {
  filePath: string
  initialPage?: number
}

export function PDFViewer({ filePath, initialPage }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [pageInput, setPageInput] = useState('')

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    const targetPage = initialPage && initialPage >= 1 && initialPage <= numPages ? initialPage : 1
    setPageNumber(targetPage)
  }

  // Update page when initialPage prop changes
  useEffect(() => {
    if (initialPage && numPages && initialPage >= 1 && initialPage <= numPages) {
      setPageNumber(initialPage)
      setPageInput(initialPage.toString())
    }
  }, [initialPage, numPages])

  // Update pageInput when pageNumber changes
  useEffect(() => {
    setPageInput(pageNumber.toString())
  }, [pageNumber])


  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1))
  }

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages || 1, prev + 1))
  }

  const zoomIn = () => {
    setScale(prev => Math.min(2.5, prev + 0.25))
  }

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.25))
  }

  const handlePageInputSubmit = () => {
    const page = parseInt(pageInput)
    if (!isNaN(page) && page >= 1 && page <= (numPages || 1)) {
      setPageNumber(page)
    } else {
      // Reset input to current page if invalid
      setPageInput(pageNumber.toString())
    }
  }

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <Button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            size="sm"
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm">Page</span>
            <Input
              type="number"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={handlePageInputKeyDown}
              onBlur={handlePageInputSubmit}
              className="w-16 h-8 text-center text-sm"
              min={1}
              max={numPages || 1}
            />
            <span className="text-sm">of {numPages || '...'}</span>
            <Button
              onClick={handlePageInputSubmit}
              size="sm"
              variant="outline"
              className="h-8 px-2 text-xs"
            >
              Go
            </Button>
          </div>
          <Button
            onClick={goToNextPage}
            disabled={pageNumber >= (numPages || 1)}
            size="sm"
            variant="outline"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={zoomOut}
            size="sm"
            variant="outline"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            onClick={zoomIn}
            size="sm"
            variant="outline"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-4">
        <Document
          file={filePath}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center">
              <span className="text-muted-foreground">Loading PDF...</span>
            </div>
          }
          error={
            <div className="flex items-center justify-center">
              <span className="text-destructive">Failed to load PDF</span>
            </div>
          }
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale}
            className="shadow-lg"
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>
    </div>
  )
}