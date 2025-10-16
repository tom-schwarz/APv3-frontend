"use client"

import { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { ArrowLeft, History, FileText, MessageSquare } from "lucide-react"
import Image from "next/image"
import dynamic from "next/dynamic"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// Import version data
import versionData from "@/pdf-summaries.json"

const PDFViewer = dynamic(
  () => import("@/components/pdf-viewer").then(mod => mod.PDFViewer),
  {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full">Loading PDF viewer...</div>
  }
)

// Presigned URLs (valid for 7 days from Oct 16, 2025)
// Note: For production, these should be generated via Lambda or API route
const PRESIGNED_URLS: Record<string, string> = {
  "VPM_Workplace_flexibility-1810.pdf": "https://apv2-askpolicy-diff-docs-ap-southeast-2.s3.ap-southeast-2.amazonaws.com/victoria-police/workplace-flexibility/VPM_Workplace_flexibility-1810.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATMYACQ2YIKI3KXZF%2F20251016%2Fap-southeast-2%2Fs3%2Faws4_request&X-Amz-Date=20251016T012627Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENn%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDmFwLXNvdXRoZWFzdC0yIkcwRQIhAKuJYwuxcUeQaDXJOSdbCyXmClP6fqQs7ypwQVZRQkerAiBvSjSmXvttamLHetuF1GRjj6Ao%2B%2BtKj2FU6sRIPfFNgCq1AwiD%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAAaDDIzMzUzOTAxMjI3MiIMEYGba1woXUjOKr4AKokDo4UFwLnq7jFH7q3bwD5F8aktX8U8Nz6oVbFGgFpxK67mkCExavzBk6hjRyTknT27zpTsVDkGSyEFt433dWNVWdsH%2Bv3QB5o0Lqkl6k4v5lpdAyAjd9daXEHUO64CCIr6vTs56j1z%2F2LXR3TfufSdB%2B2f%2Be0s3C1JQmj4PrCu8ih2iD7oLjmvEH0t6cayoXwx04fOzj7OHWjwYUrKEXnq9SUfqpbeFmvyB5GrZkCHecebWMGUolJ6zzBZf0L%2FbgE8jOujDN2iFx8b3hHIfLMbLXlSBCg5yZn%2F2D6KfapBInFYi2g%2BdHI%2FvWTXr83Xhpbq0XdcAHaCPp3zMMMxP46IdBnOsiHZBGfvaFI7uE9HD0EHFRHlXrJgJ49IIIZ7eB87q1pJrs3ZV%2FVJWnb5j%2FkbqWe3xfjlVbwJx8UdCCFRELecqL8IY3pzz%2Bs6E8uXeK6kY1BfWpUCdkwMFqPFvr04NqDuqEzZLNXlqp0OrXALMgsn1uj4OEp7hzJQW714Ku9PDjabGuQ%2BLzQnMJeSwccGOqYBywwE%2FblcMUXKeR8bYNQoa%2F2jKj2eHvVcSiIZtaRM31moXPq3JXOQJdkZDflu8D2gvfy52TPQUAHdO6nKqYGSVEOdBpv10q3HteujlhuPjt0M9Yq7J1H81LG7uU1W8foduvrUKSYgndo5Jpu%2FexBk3alnKvHhGP7YSiBmoqvGmc80CxqHLqo2no9GZWW7d5ceBnTvGGspRJC7gY%2BBZ7ATFEu3fSqViA%3D%3D&X-Amz-Signature=49db097ffca56c4c058911a872d34a975e4ea7b5d9c55ac0b75e7a69f97f0553",
  "VPM_Workplace_flexibility-1910.pdf": "https://apv2-askpolicy-diff-docs-ap-southeast-2.s3.ap-southeast-2.amazonaws.com/victoria-police/workplace-flexibility/VPM_Workplace_flexibility-1910.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATMYACQ2YIKI3KXZF%2F20251016%2Fap-southeast-2%2Fs3%2Faws4_request&X-Amz-Date=20251016T012628Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENn%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDmFwLXNvdXRoZWFzdC0yIkcwRQIhAKuJYwuxcUeQaDXJOSdbCyXmClP6fqQs7ypwQVZRQkerAiBvSjSmXvttamLHetuF1GRjj6Ao%2B%2BtKj2FU6sRIPfFNgCq1AwiD%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAAaDDIzMzUzOTAxMjI3MiIMEYGba1woXUjOKr4AKokDo4UFwLnq7jFH7q3bwD5F8aktX8U8Nz6oVbFGgFpxK67mkCExavzBk6hjRyTknT27zpTsVDkGSyEFt433dWNVWdsH%2Bv3QB5o0Lqkl6k4v5lpdAyAjd9daXEHUO64CCIr6vTs56j1z%2F2LXR3TfufSdB%2B2f%2Be0s3C1JQmj4PrCu8ih2iD7oLjmvEH0t6cayoXwx04fOzj7OHWjwYUrKEXnq9SUfqpbeFmvyB5GrZkCHecebWMGUolJ6zzBZf0L%2FbgE8jOujDN2iFx8b3hHIfLMbLXlSBCg5yZn%2F2D6KfapBInFYi2g%2BdHI%2FvWTXr83Xhpbq0XdcAHaCPp3zMMMxP46IdBnOsiHZBGfvaFI7uE9HD0EHFRHlXrJgJ49IIIZ7eB87q1pJrs3ZV%2FVJWnb5j%2FkbqWe3xfjlVbwJx8UdCCFRELecqL8IY3pzz%2Bs6E8uXeK6kY1BfWpUCdkwMFqPFvr04NqDuqEzZLNXlqp0OrXALMgsn1uj4OEp7hzJQW714Ku9PDjabGuQ%2BLzQnMJeSwccGOqYBywwE%2FblcMUXKeR8bYNQoa%2F2jKj2eHvVcSiIZtaRM31moXPq3JXOQJdkZDflu8D2gvfy52TPQUAHdO6nKqYGSVEOdBpv10q3HteujlhuPjt0M9Yq7J1H81LG7uU1W8foduvrUKSYgndo5Jpu%2FexBk3alnKvHhGP7YSiBmoqvGmc80CxqHLqo2no9GZWW7d5ceBnTvGGspRJC7gY%2BBZ7ATFEu3fSqViA%3D%3D&X-Amz-Signature=ea131a002c7bed9666269f363da5e4b7eed29c88abcde20d3818a8c0bcb5e37e",
  "VPM_Workplace_flexibility-2010.pdf": "https://apv2-askpolicy-diff-docs-ap-southeast-2.s3.ap-southeast-2.amazonaws.com/victoria-police/workplace-flexibility/VPM_Workplace_flexibility-2010.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATMYACQ2YIKI3KXZF%2F20251016%2Fap-southeast-2%2Fs3%2Faws4_request&X-Amz-Date=20251016T012628Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENn%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDmFwLXNvdXRoZWFzdC0yIkcwRQIhAKuJYwuxcUeQaDXJOSdbCyXmClP6fqQs7ypwQVZRQkerAiBvSjSmXvttamLHetuF1GRjj6Ao%2B%2BtKj2FU6sRIPfFNgCq1AwiD%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAAaDDIzMzUzOTAxMjI3MiIMEYGba1woXUjOKr4AKokDo4UFwLnq7jFH7q3bwD5F8aktX8U8Nz6oVbFGgFpxK67mkCExavzBk6hjRyTknT27zpTsVDkGSyEFt433dWNVWdsH%2Bv3QB5o0Lqkl6k4v5lpdAyAjd9daXEHUO64CCIr6vTs56j1z%2F2LXR3TfufSdB%2B2f%2Be0s3C1JQmj4PrCu8ih2iD7oLjmvEH0t6cayoXwx04fOzj7OHWjwYUrKEXnq9SUfqpbeFmvyB5GrZkCHecebWMGUolJ6zzBZf0L%2FbgE8jOujDN2iFx8b3hHIfLMbLXlSBCg5yZn%2F2D6KfapBInFYi2g%2BdHI%2FvWTXr83Xhpbq0XdcAHaCPp3zMMMxP46IdBnOsiHZBGfvaFI7uE9HD0EHFRHlXrJgJ49IIIZ7eB87q1pJrs3ZV%2FVJWnb5j%2FkbqWe3xfjlVbwJx8UdCCFRELecqL8IY3pzz%2Bs6E8uXeK6kY1BfWpUCdkwMFqPFvr04NqDuqEzZLNXlqp0OrXALMgsn1uj4OEp7hzJQW714Ku9PDjabGuQ%2BLzQnMJeSwccGOqYBywwE%2FblcMUXKeR8bYNQoa%2F2jKj2eHvVcSiIZtaRM31moXPq3JXOQJdkZDflu8D2gvfy52TPQUAHdO6nKqYGSVEOdBpv10q3HteujlhuPjt0M9Yq7J1H81LG7uU1W8foduvrUKSYgndo5Jpu%2FexBk3alnKvHhGP7YSiBmoqvGmc80CxqHLqo2no9GZWW7d5ceBnTvGGspRJC7gY%2BBZ7ATFEu3fSqViA%3D%3D&X-Amz-Signature=30c868b0045b79a8a1fa35a9734523c6ae62e5171e0b02ffe1efb2dfbf63292c",
  "VPM_Workplace_flexibility-2107.pdf": "https://apv2-askpolicy-diff-docs-ap-southeast-2.s3.ap-southeast-2.amazonaws.com/victoria-police/workplace-flexibility/VPM_Workplace_flexibility-2107.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATMYACQ2YIKI3KXZF%2F20251016%2Fap-southeast-2%2Fs3%2Faws4_request&X-Amz-Date=20251016T012628Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENn%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDmFwLXNvdXRoZWFzdC0yIkcwRQIhAKuJYwuxcUeQaDXJOSdbCyXmClP6fqQs7ypwQVZRQkerAiBvSjSmXvttamLHetuF1GRjj6Ao%2B%2BtKj2FU6sRIPfFNgCq1AwiD%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAAaDDIzMzUzOTAxMjI3MiIMEYGba1woXUjOKr4AKokDo4UFwLnq7jFH7q3bwD5F8aktX8U8Nz6oVbFGgFpxK67mkCExavzBk6hjRyTknT27zpTsVDkGSyEFt433dWNVWdsH%2Bv3QB5o0Lqkl6k4v5lpdAyAjd9daXEHUO64CCIr6vTs56j1z%2F2LXR3TfufSdB%2B2f%2Be0s3C1JQmj4PrCu8ih2iD7oLjmvEH0t6cayoXwx04fOzj7OHWjwYUrKEXnq9SUfqpbeFmvyB5GrZkCHecebWMGUolJ6zzBZf0L%2FbgE8jOujDN2iFx8b3hHIfLMbLXlSBCg5yZn%2F2D6KfapBInFYi2g%2BdHI%2FvWTXr83Xhpbq0XdcAHaCPp3zMMMxP46IdBnOsiHZBGfvaFI7uE9HD0EHFRHlXrJgJ49IIIZ7eB87q1pJrs3ZV%2FVJWnb5j%2FkbqWe3xfjlVbwJx8UdCCFRELecqL8IY3pzz%2Bs6E8uXeK6kY1BfWpUCdkwMFqPFvr04NqDuqEzZLNXlqp0OrXALMgsn1uj4OEp7hzJQW714Ku9PDjabGuQ%2BLzQnMJeSwccGOqYBywwE%2FblcMUXKeR8bYNQoa%2F2jKj2eHvVcSiIZtaRM31moXPq3JXOQJdkZDflu8D2gvfy52TPQUAHdO6nKqYGSVEOdBpv10q3HteujlhuPjt0M9Yq7J1H81LG7uU1W8foduvrUKSYgndo5Jpu%2FexBk3alnKvHhGP7YSiBmoqvGmc80CxqHLqo2no9GZWW7d5ceBnTvGGspRJC7gY%2BBZ7ATFEu3fSqViA%3D%3D&X-Amz-Signature=ea99bbe42ad0fdc4e0410cb9064ab21eb5f307926122a0d25c1e2ee66bf65ab0",
  "VPM_Workplace_flexibility-2207.pdf": "https://apv2-askpolicy-diff-docs-ap-southeast-2.s3.ap-southeast-2.amazonaws.com/victoria-police/workplace-flexibility/VPM_Workplace_flexibility-2207.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATMYACQ2YIKI3KXZF%2F20251016%2Fap-southeast-2%2Fs3%2Faws4_request&X-Amz-Date=20251016T012628Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENn%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDmFwLXNvdXRoZWFzdC0yIkcwRQIhAKuJYwuxcUeQaDXJOSdbCyXmClP6fqQs7ypwQVZRQkerAiBvSjSmXvttamLHetuF1GRjj6Ao%2B%2BtKj2FU6sRIPfFNgCq1AwiD%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAAaDDIzMzUzOTAxMjI3MiIMEYGba1woXUjOKr4AKokDo4UFwLnq7jFH7q3bwD5F8aktX8U8Nz6oVbFGgFpxK67mkCExavzBk6hjRyTknT27zpTsVDkGSyEFt433dWNVWdsH%2Bv3QB5o0Lqkl6k4v5lpdAyAjd9daXEHUO64CCIr6vTs56j1z%2F2LXR3TfufSdB%2B2f%2Be0s3C1JQmj4PrCu8ih2iD7oLjmvEH0t6cayoXwx04fOzj7OHWjwYUrKEXnq9SUfqpbeFmvyB5GrZkCHecebWMGUolJ6zzBZf0L%2FbgE8jOujDN2iFx8b3hHIfLMbLXlSBCg5yZn%2F2D6KfapBInFYi2g%2BdHI%2FvWTXr83Xhpbq0XdcAHaCPp3zMMMxP46IdBnOsiHZBGfvaFI7uE9HD0EHFRHlXrJgJ49IIIZ7eB87q1pJrs3ZV%2FVJWnb5j%2FkbqWe3xfjlVbwJx8UdCCFRELecqL8IY3pzz%2Bs6E8uXeK6kY1BfWpUCdkwMFqPFvr04NqDuqEzZLNXlqp0OrXALMgsn1uj4OEp7hzJQW714Ku9PDjabGuQ%2BLzQnMJeSwccGOqYBywwE%2FblcMUXKeR8bYNQoa%2F2jKj2eHvVcSiIZtaRM31moXPq3JXOQJdkZDflu8D2gvfy52TPQUAHdO6nKqYGSVEOdBpv10q3HteujlhuPjt0M9Yq7J1H81LG7uU1W8foduvrUKSYgndo5Jpu%2FexBk3alnKvHhGP7YSiBmoqvGmc80CxqHLqo2no9GZWW7d5ceBnTvGGspRJC7gY%2BBZ7ATFEu3fSqViA%3D%3D&X-Amz-Signature=fd92b61ff719bf7a16eab1ecd89d47e758a532607f5d7850572ca87e8c4f4aa1",
  "VPM_Workplace_flexibility-latest.pdf": "https://apv2-askpolicy-diff-docs-ap-southeast-2.s3.ap-southeast-2.amazonaws.com/victoria-police/workplace-flexibility/VPM_Workplace_flexibility-latest.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATMYACQ2YIKI3KXZF%2F20251016%2Fap-southeast-2%2Fs3%2Faws4_request&X-Amz-Date=20251016T012629Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENn%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDmFwLXNvdXRoZWFzdC0yIkcwRQIhAKuJYwuxcUeQaDXJOSdbCyXmClP6fqQs7ypwQVZRQkerAiBvSjSmXvttamLHetuF1GRjj6Ao%2B%2BtKj2FU6sRIPfFNgCq1AwiD%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAAaDDIzMzUzOTAxMjI3MiIMEYGba1woXUjOKr4AKokDo4UFwLnq7jFH7q3bwD5F8aktX8U8Nz6oVbFGgFpxK67mkCExavzBk6hjRyTknT27zpTsVDkGSyEFt433dWNVWdsH%2Bv3QB5o0Lqkl6k4v5lpdAyAjd9daXEHUO64CCIr6vTs56j1z%2F2LXR3TfufSdB%2B2f%2Be0s3C1JQmj4PrCu8ih2iD7oLjmvEH0t6cayoXwx04fOzj7OHWjwYUrKEXnq9SUfqpbeFmvyB5GrZkCHecebWMGUolJ6zzBZf0L%2FbgE8jOujDN2iFx8b3hHIfLMbLXlSBCg5yZn%2F2D6KfapBInFYi2g%2BdHI%2FvWTXr83Xhpbq0XdcAHaCPp3zMMMxP46IdBnOsiHZBGfvaFI7uE9HD0EHFRHlXrJgJ49IIIZ7eB87q1pJrs3ZV%2FVJWnb5j%2FkbqWe3xfjlVbwJx8UdCCFRELecqL8IY3pzz%2Bs6E8uXeK6kY1BfWpUCdkwMFqPFvr04NqDuqEzZLNXlqp0OrXALMgsn1uj4OEp7hzJQW714Ku9PDjabGuQ%2BLzQnMJeSwccGOqYBywwE%2FblcMUXKeR8bYNQoa%2F2jKj2eHvVcSiIZtaRM31moXPq3JXOQJdkZDflu8D2gvfy52TPQUAHdO6nKqYGSVEOdBpv10q3HteujlhuPjt0M9Yq7J1H81LG7uU1W8foduvrUKSYgndo5Jpu%2FexBk3alnKvHhGP7YSiBmoqvGmc80CxqHLqo2no9GZWW7d5ceBnTvGGspRJC7gY%2BBZ7ATFEu3fSqViA%3D%3D&X-Amz-Signature=fb49ddae53551a3a07b68672db4b0154505ac5d86414535b8f0f0271c5462ac7",
}

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

function HistoryPageContent() {
  const router = useRouter()

  // Build versions with presigned URLs
  const versions: Version[] = versionData.versions.map(v => ({
    ...v,
    url: PRESIGNED_URLS[v.filename] || '',
    size: VERSION_SIZES[v.filename] || 0
  }))

  const [selectedVersionId, setSelectedVersionId] = useState<number>(6) // Default to latest

  const selectedVersion = versions.find(v => v.id === selectedVersionId)

  // Find summary for the selected version (changes from previous version)
  const getVersionSummary = () => {
    if (!selectedVersionId || selectedVersionId === 1) return null // No summary for first version

    return versionData.summaries.find(
      s => s.newVersion === selectedVersionId
    )
  }

  const summary = getVersionSummary()

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

      {/* Version Selection Bar */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

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
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-border"></div>

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
                      relative z-10 w-12 h-12 rounded-full border-4
                      transition-all duration-200 hover:scale-110
                      ${isSelected
                        ? 'bg-primary border-primary shadow-lg'
                        : 'bg-background border-border hover:border-primary/50'
                      }
                    `}
                    title={`View ${version.version}`}
                  >
                    <div className={`flex items-center justify-center h-full ${isSelected ? 'text-white' : 'text-muted-foreground'}`}>
                      <FileText className="h-5 w-5" />
                    </div>
                  </button>

                  {/* Version label */}
                  <div className="mt-3 text-center min-w-[80px]">
                    <div className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {version.version}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {version.size} KB
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected version info */}
        {selectedVersion && (
          <div className="mt-4 pt-3 border-t flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium">Viewing:</span>
              <span className="text-muted-foreground">{selectedVersion.version} ({selectedVersion.filename})</span>
            </div>
            {summary && (
              <>
                <div className="h-4 w-px bg-border"></div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    Showing changes from {summary.oldVersionName} → {summary.newVersionName}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* PDF Viewer Panel */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-sm">
                {selectedVersion ? `${selectedVersion.version} - ${selectedVersion.filename}` : "No version selected"}
              </h3>
            </div>

            <div className="flex-1 overflow-hidden">
              {selectedVersion ? (
                <PDFViewer filePath={selectedVersion.url} />
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

        {/* Changes Panel */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <h3 className="font-semibold text-sm">
                  {summary ? `What's New in ${selectedVersion?.version}` : 'Version Changes'}
                </h3>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {summary ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Changes from {summary.oldVersionName} to {summary.newVersionName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <div className="text-xs text-muted-foreground mb-4">
                        Analysis generated using {versionData.model}
                      </div>
                      <div
                        className="text-sm whitespace-pre-wrap"
                        style={{ fontSize: '0.875rem', lineHeight: '1.5' }}
                      >
                        {summary.summary.split('\n').slice(0, 50).join('\n')}
                        {summary.summary.split('\n').length > 50 && (
                          <p className="text-muted-foreground italic mt-4">
                            ... (Summary truncated for display)
                          </p>
                        )}
                      </div>
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
