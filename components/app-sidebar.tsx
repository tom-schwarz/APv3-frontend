"use client"

import * as React from "react"
import { ChevronRight, File, Folder, FileText } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarRail,
} from "@/components/ui/sidebar"

interface Document {
  id: string;
  title: string;
  status: string;
  indexed_in_kb?: boolean;
}

interface Agency {
  name: string;
  documents: Document[];
}

interface DocumentTreeResponse {
  agencies: Record<string, Agency>;
}

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileItem[];
  document?: Document;
  agency?: string;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [files, setFiles] = React.useState<FileItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  
  React.useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(process.env.NEXT_PUBLIC_DOCUMENTS_API_URL || 'https://7hixztmew2qha5brfzg4zqu7nq0ccadh.lambda-url.ap-southeast-2.on.aws/');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch documents: ${response.status}`);
        }
        
        const data: DocumentTreeResponse = await response.json();
        
        // Transform the response into the FileItem structure
        const transformedFiles: FileItem[] = Object.entries(data.agencies).map(([agencyKey, agency]) => ({
          name: agency.name,
          type: 'folder' as const,
          path: agencyKey,
          agency: agencyKey,
          children: agency.documents.map(doc => ({
            name: doc.title,
            type: 'file' as const,
            path: `${agencyKey}/${doc.id}`,
            document: doc,
            agency: agencyKey
          }))
        }));
        
        setFiles(transformedFiles);
      } catch (err) {
        console.error('Failed to fetch documents:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch documents');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'file' && file.document) {
      // Use document ID for navigation instead of PDF path
      router.push(`/dashboard?doc=${file.document.id}&agency=${file.agency}`);
    }
  };

  const getFileIcon = (item: FileItem) => {
    if (item.type === 'folder') return <Folder className="h-4 w-4" />;
    if (item.type === 'file') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Document Browser</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? (
                <div className="px-2 py-4 text-sm text-muted-foreground">
                  Loading documents...
                </div>
              ) : error ? (
                <div className="px-2 py-4 text-sm text-red-500">
                  Error: {error}
                </div>
              ) : files.length === 0 ? (
                <div className="px-2 py-4 text-sm text-muted-foreground">
                  No documents found
                </div>
              ) : (
                files.map((item, index) => (
                  <Tree 
                    key={index} 
                    item={item} 
                    onFileClick={handleFileClick}
                    getFileIcon={getFileIcon}
                    currentPath={pathname}
                  />
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

interface TreeProps {
  item: FileItem;
  onFileClick: (file: FileItem) => void;
  getFileIcon: (item: FileItem) => React.ReactNode;
  currentPath: string;
}

function Tree({ item, onFileClick, getFileIcon, currentPath }: TreeProps) {
  const isDocument = item.type === 'file' && item.document;
  const isIndexed = item.document?.indexed_in_kb;
  
  if (item.type === 'file') {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => onFileClick(item)}
          className={isDocument ? "cursor-pointer hover:bg-accent" : "cursor-default"}
        >
          {getFileIcon(item)}
          <span className="ml-2 flex-1">{item.name}</span>
          {isDocument && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              isIndexed 
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
            }`}>
              {isIndexed ? 'Ready' : 'Processing'}
            </span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        defaultOpen={true}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <ChevronRight className="h-4 w-4 transition-transform" />
            {getFileIcon(item)}
            <span className="ml-2">{item.name}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((subItem, index) => (
              <Tree 
                key={index} 
                item={subItem} 
                onFileClick={onFileClick}
                getFileIcon={getFileIcon}
                currentPath={currentPath}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}