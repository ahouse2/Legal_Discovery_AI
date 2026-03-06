import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Image, File, CheckCircle, Loader2, Download, Database, Filter } from 'lucide-react';
import { db, auth } from '@/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface IndexedFile {
  id: string;
  name: string;
  mimeType: string;
  processed: boolean;
  summary?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  topics?: string[];
  cypherStatements?: string[];
}

export default function Files() {
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'files'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filesData: IndexedFile[] = [];
      snapshot.forEach((doc) => {
        filesData.push({ id: doc.id, ...doc.data() } as IndexedFile);
      });
      setFiles(filesData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleIndex = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/files/index', { method: 'POST' });
      const data = await res.json();
      
      const batchPromises = data.files.map((file: any) => {
        return addDoc(collection(db, 'files'), {
          name: file.name,
          mimeType: file.mimeType,
          webViewLink: file.webViewLink || '',
          thumbnailLink: file.thumbnailLink || '',
          processed: false,
          ownerId: user.uid,
          createdAt: serverTimestamp()
        });
      });
      
      await Promise.all(batchPromises);
      
    } catch (err) {
      console.error('Failed to index files', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (file: IndexedFile) => {
    if (!user) return;
    setProcessing(file.id);
    try {
      const res = await fetch('/api/files/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileId: file.id,
          name: file.name,
          mimeType: file.mimeType
        })
      });
      
      const analysis = await res.json();
      
      await updateDoc(doc(db, 'files', file.id), {
        processed: true,
        summary: analysis.summary,
        topics: analysis.topics || [],
        embedding: analysis.embedding || [],
        cypherStatements: analysis.cypherStatements || []
      });

      const entityPromises = analysis.entities.map((e: any) => 
        addDoc(collection(db, 'entities'), {
          name: e.name,
          type: e.type,
          fileId: file.id,
          ownerId: user.uid
        })
      );

      const eventPromises = analysis.events.map((e: any) => 
        addDoc(collection(db, 'events'), {
          date: e.date,
          description: e.description,
          fileId: file.id,
          ownerId: user.uid
        })
      );

      await Promise.all([...entityPromises, ...eventPromises]);

    } catch (err) {
      console.error('Failed to process file', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleExportCypher = (file: IndexedFile) => {
    if (!file.cypherStatements) return;
    const cypher = file.cypherStatements.join('\n');
    const blob = new Blob([cypher], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${file.name.replace(/\s+/g, '_')}_graph.cypher`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (mimeType.includes('image')) return <Image className="h-4 w-4 text-blue-500" />;
    return <File className="h-4 w-4 text-zinc-500" />;
  };

  // Get unique topics for filter
  const allTopics = Array.from(new Set(files.flatMap(f => f.topics || []))).sort();

  const filteredFiles = files.filter(file => {
    const matchesType = typeFilter === 'all' || file.mimeType.includes(typeFilter);
    const matchesTopic = topicFilter === 'all' || (file.topics && file.topics.includes(topicFilter));
    return matchesType && matchesTopic;
  });

  return (
    <div className="space-y-8 min-h-screen pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">File Explorer</h1>
          <p className="text-zinc-400 mt-2">Browse and manage indexed evidence files.</p>
        </div>
        <Button onClick={handleIndex} disabled={loading || !user} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
          Index Drive Folder
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <Filter className="h-4 w-4" />
          Filters:
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px] bg-zinc-900/50 border-zinc-800 text-zinc-300">
            <SelectValue placeholder="File Type" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="pdf">PDF Documents</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="word">Word Documents</SelectItem>
          </SelectContent>
        </Select>

        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="w-[180px] bg-zinc-900/50 border-zinc-800 text-zinc-300">
            <SelectValue placeholder="Topic" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
            <SelectItem value="all">All Topics</SelectItem>
            {allTopics.map(topic => (
              <SelectItem key={topic} value={topic}>{topic}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/90 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-zinc-100">Indexed Files</CardTitle>
        </CardHeader>
        <CardContent>
          {!user ? (
             <div className="text-center py-8 text-zinc-500">
               Please sign in to view files.
             </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              {files.length === 0 ? 'No files indexed. Click "Index Drive Folder" to start.' : 'No files match your filters.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                  <TableHead className="w-[50px] text-zinc-400"></TableHead>
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Type</TableHead>
                  <TableHead className="text-zinc-400">Topics</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-right text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file) => (
                  <TableRow key={file.id} className="border-zinc-800 hover:bg-zinc-900/50">
                    <TableCell>{getIcon(file.mimeType)}</TableCell>
                    <TableCell className="font-medium text-zinc-200">{file.name}</TableCell>
                    <TableCell className="text-zinc-500 text-sm">{file.mimeType.split('/')[1]}</TableCell>
                    <TableCell className="text-zinc-500 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {file.topics?.slice(0, 2).map((t, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs border border-zinc-700">
                            {t}
                          </span>
                        ))}
                        {file.topics && file.topics.length > 2 && (
                          <span className="text-xs text-zinc-600">+{file.topics.length - 2}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {file.processed ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-900">
                          Processed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-950 text-yellow-400 border border-yellow-900">
                          Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {file.processed && file.cypherStatements && (
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           onClick={() => handleExportCypher(file)}
                           className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                           title="Export to Neo4j Cypher"
                         >
                           <Database className="h-4 w-4" />
                         </Button>
                      )}
                      {file.processed ? (
                        <Button variant="ghost" size="sm" disabled className="text-emerald-500">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Done
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleProcess(file)}
                          disabled={processing === file.id}
                          className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                        >
                          {processing === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Process
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
