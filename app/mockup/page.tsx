"use client"

import { useState, useEffect } from "react"
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

// Mock data
const agencies = [
  {
    name: "Victoria Police",
    count: 15,
    expanded: true,
    documents: [
      { id: "vp-001", title: "Mental Health Response Protocol", status: "ready", pages: 24 },
      { id: "vp-002", title: "Crisis Intervention Guidelines", status: "ready", pages: 18 },
      { id: "vp-003", title: "Officer Safety Manual", status: "processing", pages: 156 }
    ]
  },
  {
    name: "Department of Health",
    count: 23,
    expanded: false,
    documents: [
      { id: "dh-001", title: "Mental Health Act 2014", status: "ready", pages: 89 },
      { id: "dh-002", title: "Community Treatment Orders", status: "ready", pages: 34 }
    ]
  },
  {
    name: "Ambulance Victoria",
    count: 8,
    expanded: false,
    documents: [
      { id: "av-001", title: "Mental Health Transport Protocol", status: "ready", pages: 12 }
    ]
  }
]

const mockCitations = [
  {
    id: "cite-1",
    document: "Mental Health Response Protocol",
    agency: "Victoria Police",
    page: 15,
    text: "Officers must assess the immediate risk to the person and others before determining the appropriate response pathway...",
    relevanceScore: 0.92
  },
  {
    id: "cite-2", 
    document: "Mental Health Act 2014",
    agency: "Department of Health",
    page: 23,
    text: "A person may be assessed and treated for mental illness only with their consent, except in circumstances specified in this Act...",
    relevanceScore: 0.87
  },
  {
    id: "cite-3",
    document: "Crisis Intervention Guidelines", 
    agency: "Victoria Police",
    page: 8,
    text: "De-escalation techniques should prioritize verbal communication and establishing rapport with the individual in crisis...",
    relevanceScore: 0.84
  }
]

const mockConversation = [
  {
    id: "msg-1",
    type: "user" as const,
    content: "What are the key protocols for police responding to mental health crises?",
    timestamp: "2025-08-13T14:30:00Z"
  },
  {
    id: "msg-2", 
    type: "assistant" as const,
    content: "Based on the Victoria Police Mental Health Response Protocol and related guidelines, there are several key protocols for responding to mental health crises:\n\n**1. Risk Assessment**\nOfficers must first assess the immediate risk to the person experiencing the crisis and to others in the vicinity. This initial assessment determines the response pathway.\n\n**2. De-escalation Priority**\nThe Crisis Intervention Guidelines emphasize that de-escalation techniques should be the first approach, prioritizing verbal communication and establishing rapport with the individual.\n\n**3. Legal Framework**\nUnder the Mental Health Act 2014, treatment and assessment require consent except in specific circumstances outlined in the legislation.\n\n**4. Multi-agency Coordination**\nProtocols establish clear pathways for involving Ambulance Victoria and mental health services when appropriate.",
    timestamp: "2025-08-13T14:30:15Z",
    citations: ["cite-1", "cite-2", "cite-3"]
  }
]

export default function MockupPage() {
  const [selectedDocument, setSelectedDocument] = useState<string | null>("vp-001")
  const [chatInput, setChatInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingProgress, setStreamingProgress] = useState(0)
  const [selectedAgencies] = useState<string[]>(["Victoria Police", "Department of Health"])

  // Simulate streaming response
  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        setStreamingProgress(prev => {
          if (prev >= 100) {
            setIsStreaming(false)
            return 0
          }
          return prev + 2
        })
      }, 50)
      return () => clearInterval(interval)
    }
  }, [isStreaming])

  const handleSendMessage = () => {
    if (!chatInput.trim()) return
    setIsStreaming(true)
    setChatInput("")
  }

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
            {agencies.reduce((acc, agency) => acc + agency.count, 0)} documents
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
                {agencies.map((agency) => (
                  <div key={agency.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {agency.expanded ? (
                          <FolderOpen className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Folder className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">{agency.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {agency.count}
                      </Badge>
                    </div>
                    
                    {agency.expanded && (
                      <div className="ml-6 space-y-1">
                        {agency.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className={`flex items-center gap-2 p-2 rounded-md text-xs cursor-pointer transition-colors ${
                              selectedDocument === doc.id
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-muted/50"
                            }`}
                            onClick={() => setSelectedDocument(doc.id)}
                          >
                            <FileText className="h-3 w-3" />
                            <div className="flex-1 min-w-0">
                              <div className="truncate font-medium">{doc.title}</div>
                              <div className="text-muted-foreground">{doc.pages} pages</div>
                            </div>
                            <div className="flex-shrink-0">
                              {doc.status === "ready" ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <Clock className="h-3 w-3 text-orange-500" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
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
                    {selectedDocument ? "Mental Health Response Protocol" : "Select a document"}
                  </h3>
                  {selectedDocument && (
                    <p className="text-xs text-muted-foreground">Victoria Police • Page 1 of 24</p>
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
            
            <div className="flex-1 bg-muted/30 flex items-center justify-center">
              {selectedDocument ? (
                <div className="w-full max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-sm">
                  <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold mb-2">Mental Health Response Protocol</h1>
                    <p className="text-sm text-muted-foreground">Victoria Police • Version 3.2 • 2024</p>
                  </div>
                  
                  <div className="space-y-4 text-sm">
                    <section>
                      <h2 className="text-lg font-semibold mb-2">1. Introduction</h2>
                      <p>This protocol provides guidance for Victoria Police members when responding to incidents involving persons who may be experiencing mental illness or psychological distress.</p>
                    </section>
                    
                    <section>
                      <h2 className="text-lg font-semibold mb-2">2. Risk Assessment</h2>
                      <p className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                        <strong>Key Point:</strong> Officers must assess the immediate risk to the person and others before determining the appropriate response pathway. This assessment should consider the person&apos;s behavior, statements, and environmental factors.
                      </p>
                    </section>
                    
                    <section>
                      <h2 className="text-lg font-semibold mb-2">3. Response Options</h2>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Voluntary referral to mental health services</li>
                        <li>Police assistance with transport to medical facility</li>
                        <li>Mental Health Act assessment</li>
                        <li>Emergency intervention under section 351</li>
                      </ul>
                    </section>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a document from the browser to view</p>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Chat & Citations Panel */}
        <ResizablePanel defaultSize={40} minSize={30}>
          <Tabs defaultValue="chat" className="flex flex-col h-full">
            <div className="border-b px-4 pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="citations" className="flex items-center gap-2">
                  <Quote className="h-4 w-4" />
                  Citations ({mockCitations.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="flex-1 flex flex-col m-0">
              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {mockConversation.map((message) => (
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
                          
                          {message.citations && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <div className="text-xs text-muted-foreground mb-2">
                                Sources ({message.citations.length}):
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {message.citations.map((citationId) => {
                                  const citation = mockCitations.find(c => c.id === citationId)
                                  return citation ? (
                                    <Badge key={citationId} variant="outline" className="text-xs">
                                      {citation.document} (p.{citation.page})
                                    </Badge>
                                  ) : null
                                })}
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
                  
                  {isStreaming && (
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
                            <Progress value={streamingProgress} className="h-1" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask about mental health policies..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !isStreaming && handleSendMessage()}
                    disabled={isStreaming}
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isStreaming}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Filter className="h-3 w-3" />
                  <span>Searching across {selectedAgencies.length} selected agencies</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="citations" className="flex-1 m-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-3">
                  {mockCitations.map((citation) => (
                    <Card key={citation.id} className="border hover:bg-muted/30 transition-colors cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-sm font-medium">
                              {citation.document}
                            </CardTitle>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{citation.agency}</span>
                              <Separator orientation="vertical" className="h-3" />
                              <span>Page {citation.page}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(citation.relevanceScore * 100)}% match
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          &quot;{citation.text}&quot;
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-7 text-xs">
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
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}