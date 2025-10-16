"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, History } from "lucide-react"
import Image from "next/image"

function HistoryPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const documentId = searchParams.get('doc')
  const agency = searchParams.get('agency')

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
        <div className="flex items-center gap-2">
          <Image
            src="/360_bulb_logo.png"
            alt="360 Logo"
            width={28}
            height={28}
            className="rounded-full"
          />
          <h1 className="font-semibold">AskPolicy</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container max-w-4xl mx-auto p-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const params = new URLSearchParams()
              if (documentId) params.set('doc', documentId)
              if (agency) params.set('agency', agency)
              router.push(`/?${params.toString()}`)
            }}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Document
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <History className="h-6 w-6 text-primary" />
                <CardTitle>Document Version History</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">
                    <span className="font-semibold">Document ID:</span> {documentId || 'Not specified'}
                  </p>
                  {agency && (
                    <p className="mb-4">
                      <span className="font-semibold">Agency:</span> {decodeURIComponent(agency)}
                    </p>
                  )}
                </div>

                <div className="p-6 bg-muted/30 rounded-lg border-2 border-dashed text-center">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-semibold mb-2">Version History Viewer</p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    This is a placeholder page for the diff viewer feature.
                    The full implementation will display document version history,
                    side-by-side comparisons, and change summaries.
                  </p>
                </div>

                <div className="mt-6 text-xs text-muted-foreground">
                  <p className="font-semibold mb-2">Planned Features:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Timeline view of all document versions</li>
                    <li>Side-by-side PDF comparison</li>
                    <li>Highlighted changes between versions</li>
                    <li>Change summaries and metadata</li>
                    <li>Version selection and navigation</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
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
