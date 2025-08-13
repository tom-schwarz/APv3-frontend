"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ExternalLink } from "lucide-react"

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

interface CitationModalProps {
  citation: Citation;
  index: number;
  children: React.ReactNode;
  onViewInDocument?: (citation: Citation) => void;
}

export function CitationModal({ citation, index, children, onViewInDocument }: CitationModalProps) {
  const extractFilename = (uri: string) => {
    return uri.split('/').pop()?.replace('.pdf', '') || 'Unknown';
  };

  const formatMetadata = (citation: Citation) => {
    const metadata = {
      'Source Number': citation.source_number || index + 1,
      'Document ID': citation.document_id || 'Unknown',
      'Title': citation.title || extractFilename(citation.location.s3Location.uri),
      'Agency': citation.agency || 'Unknown',
      'Page Numbers': citation.page_numbers?.length ? citation.page_numbers.join(', ') : 'Not specified',
      'Relevance Score': citation.relevance_score ? citation.relevance_score.toFixed(4) : 'Not specified',
      'S3 URI': citation.location.s3Location.uri,
    };
    
    return metadata;
  };

  const metadata = formatMetadata(citation);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Citation Details
            <Badge variant="secondary">Source {metadata['Source Number']}</Badge>
          </DialogTitle>
          <DialogDescription>
            Detailed information about this citation from the knowledge base
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Metadata Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Metadata</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(metadata).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <dt className="text-sm font-medium text-muted-foreground">
                      {key}
                    </dt>
                    <dd className="text-sm break-all">
                      {key === 'S3 URI' ? (
                        <code className="bg-muted px-2 py-1 rounded text-xs">
                          {value}
                        </code>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Content Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Citation Content</h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {citation.generatedResponsePart.textResponsePart.text}
                </p>
              </div>
            </div>

            {/* View in Document Button */}
            {citation.document_id && citation.agency && onViewInDocument && (
              <div>
                <Button
                  onClick={() => onViewInDocument(citation)}
                  className="w-full"
                  variant="default"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View in Document
                  {citation.page_numbers && citation.page_numbers.length > 0 && (
                    <span className="ml-1">(Page {citation.page_numbers[0]})</span>
                  )}
                </Button>
              </div>
            )}

            <Separator />

            {/* Raw JSON Section for debugging */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Raw Citation Data</h3>
              <div className="bg-muted/30 p-4 rounded-lg">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(citation, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}