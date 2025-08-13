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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"

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

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onSelectionChange?: (selectedFiles: Array<{documentId: string, agency: string, title: string}>) => void;
}

export function AppSidebar({ onSelectionChange, ...props }: AppSidebarProps) {
  const [files, setFiles] = React.useState<FileItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [checkedItems, setCheckedItems] = React.useState<Set<string>>(new Set());
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
      router.push(`/?doc=${file.document.id}&agency=${file.agency}`);
    }
  };

  const getFileIcon = (item: FileItem) => {
    if (item.type === 'folder') return <Folder className="h-4 w-4" />;
    if (item.type === 'file') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const handleCheckboxChange = (item: FileItem, checked: boolean) => {
    const newCheckedItems = new Set(checkedItems);
    
    if (item.type === 'folder') {
      // If it's a folder, toggle all children
      if (checked) {
        newCheckedItems.add(item.path);
        item.children?.forEach(child => {
          newCheckedItems.add(child.path);
        });
      } else {
        newCheckedItems.delete(item.path);
        item.children?.forEach(child => {
          newCheckedItems.delete(child.path);
        });
      }
    } else {
      // If it's a file, just toggle the file
      if (checked) {
        newCheckedItems.add(item.path);
      } else {
        newCheckedItems.delete(item.path);
      }
    }
    
    setCheckedItems(newCheckedItems);
    
    // Call the selection change callback if provided
    if (onSelectionChange) {
      const selectedFiles: Array<{documentId: string, agency: string, title: string}> = [];
      
      // Find all selected files
      const getAllFiles = (items: FileItem[]): FileItem[] => {
        let result: FileItem[] = [];
        items.forEach(item => {
          if (item.type === 'file') {
            result.push(item);
          }
          if (item.children) {
            result.push(...getAllFiles(item.children));
          }
        });
        return result;
      };
      
      const allFiles = getAllFiles(files);
      allFiles.forEach(file => {
        if (newCheckedItems.has(file.path) && file.document && file.agency) {
          selectedFiles.push({
            documentId: file.document.id,
            agency: file.agency,
            title: file.document.title
          });
        }
      });
      
      onSelectionChange(selectedFiles);
    }
  };

  const isItemChecked = (item: FileItem) => {
    return checkedItems.has(item.path);
  };

  const isFolderIndeterminate = (item: FileItem) => {
    if (item.type !== 'folder' || !item.children) return false;
    
    const checkedChildren = item.children.filter(child => checkedItems.has(child.path));
    return checkedChildren.length > 0 && checkedChildren.length < item.children.length;
  };

  return (
    <TooltipProvider delayDuration={200}>
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
                      onCheckboxChange={handleCheckboxChange}
                      isChecked={isItemChecked(item)}
                      isIndeterminate={isFolderIndeterminate(item)}
                      checkedItems={checkedItems}
                    />
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
    </TooltipProvider>
  )
}

interface TreeProps {
  item: FileItem;
  onFileClick: (file: FileItem) => void;
  getFileIcon: (item: FileItem) => React.ReactNode;
  currentPath: string;
  onCheckboxChange: (item: FileItem, checked: boolean) => void;
  isChecked: boolean;
  isIndeterminate: boolean;
  checkedItems: Set<string>;
}

function Tree({ item, onFileClick, getFileIcon, currentPath, onCheckboxChange, isChecked, isIndeterminate, checkedItems }: TreeProps) {
  const isDocument = item.type === 'file' && item.document;
  const isIndexed = item.document?.indexed_in_kb;
  
  if (item.type === 'file') {
    return (
      <SidebarMenuItem>
        <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${isChecked ? 'bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-900' : ''}`}>
          <Checkbox
            checked={isChecked}
            onCheckedChange={(checked) => onCheckboxChange(item, checked as boolean)}
            className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarMenuButton
                onClick={() => onFileClick(item)}
                className={`flex-1 ${isDocument ? "cursor-pointer hover:bg-accent" : "cursor-default"}`}
              >
                {getFileIcon(item)}
                <span className="ml-2 flex-1 truncate">{item.name}</span>
                {isDocument && !isIndexed && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                    Processing
                  </span>
                )}
              </SidebarMenuButton>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.name}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible"
        defaultOpen={true}
      >
        <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${isChecked ? 'bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-900' : ''}`}>
          <Checkbox
            checked={isIndeterminate ? "indeterminate" : isChecked}
            onCheckedChange={(checked) => onCheckboxChange(item, checked as boolean)}
            className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=indeterminate]:border-blue-600 data-[state=indeterminate]:bg-blue-600"
          />
          <CollapsibleTrigger asChild>
            <button className="flex items-center flex-1 hover:bg-accent rounded p-1">
              <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center flex-1">
                    {getFileIcon(item)}
                    <span className="ml-2 truncate">{item.name}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.name}</p>
                </TooltipContent>
              </Tooltip>
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((subItem, index) => {
              const childChecked = checkedItems.has(subItem.path);
              const childIndeterminate = subItem.type === 'folder' && subItem.children ? 
                subItem.children.some(child => checkedItems.has(child.path)) && 
                !subItem.children.every(child => checkedItems.has(child.path)) : false;
              
              return (
                <Tree 
                  key={index} 
                  item={subItem} 
                  onFileClick={onFileClick}
                  getFileIcon={getFileIcon}
                  currentPath={currentPath}
                  onCheckboxChange={onCheckboxChange}
                  isChecked={childChecked}
                  isIndeterminate={childIndeterminate}
                  checkedItems={checkedItems}
                />
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}