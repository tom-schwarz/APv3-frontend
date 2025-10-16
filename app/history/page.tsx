"use client"

import { useState, Suspense } from "react"
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

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: string
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [llmResponse, setLlmResponse] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'summary' | 'chat'>('summary')

  const selectedVersion = versions.find(v => v.id === selectedVersionId)

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
    setLlmResponse('')
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

    setLoading(true)
    setError(null)
    setLlmResponse('')

    try {
      // Lambda function URL (to be created)
      const apiUrl = process.env.NEXT_PUBLIC_DIFF_CHAT_API_URL || 'https://NOT-YET-CREATED.lambda-url.ap-southeast-2.on.aws/'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message: query,
          version_id: selectedVersionId,
          version_name: selectedVersion.version,
          document_filename: selectedVersion.filename,
          summary_context: summary ? summary.summary : null,
          session_id: `diff-session-${Date.now()}`,
          model_id: "anthropic.claude-3-haiku-20240307-v1:0"
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to submit query: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('text/event-stream') && !contentType?.includes('application/octet-stream')) {
        const data = await response.json()
        setLlmResponse(data.answer || '')

        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          type: 'assistant',
          content: data.answer || '',
          timestamp: new Date().toISOString()
        }
        setChatMessages(prev => [...prev, assistantMessage])
        setActiveTab('chat')
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

                if (currentEvent === 'delta' || parsed.text) {
                  const newText = parsed.text || ''
                  streamingResponse += newText
                  setLlmResponse(streamingResponse)
                  setActiveTab('chat')
                } else if (currentEvent === 'error' || parsed.message) {
                  throw new Error(parsed.message || 'Stream error')
                } else if (currentEvent === 'end' || parsed.done) {
                  // Add complete assistant message
                  const assistantMessage: ChatMessage = {
                    id: `msg-${Date.now() + 1}`,
                    type: 'assistant',
                    content: streamingResponse,
                    timestamp: new Date().toISOString()
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
                              <CardContent className="px-2 py-0">
                                <div className="text-sm whitespace-pre-wrap">
                                  {message.content}
                                </div>
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
                              <CardContent className="p-2">
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
                        placeholder="Ask about this version's changes..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !loading && handleSendMessage()}
                        disabled={loading}
                      />
                      <Button
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={!query.trim() || loading || !selectedVersion}
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
                    {error && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-xs">
                        {error}
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
