import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Calendar, FileText, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { db, auth } from '@/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import DocumentInspector from '@/components/DocumentInspector';

interface Event {
  id: string;
  date: string;
  description: string;
  fileId: string;
}

interface DocumentData {
  id: string;
  name: string;
  summary?: string;
  topics?: string[];
  cypherStatements?: string[];
  webViewLink?: string;
}

export default function Timeline() {
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentData | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'events'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData: Event[] = [];
      snapshot.forEach((doc) => {
        eventsData.push({ id: doc.id, ...doc.data() } as Event);
      });
      
      // Sort by date descending
      const sorted = eventsData.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setEvents(sorted);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleInspectDocument = async (fileId: string) => {
    try {
      const docRef = doc(db, 'files', fileId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSelectedDoc({ id: docSnap.id, ...docSnap.data() } as DocumentData);
        setIsInspectorOpen(true);
      }
    } catch (error) {
      console.error("Error fetching document details:", error);
    }
  };

  const filteredEvents = events.filter(event => 
    event.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 min-h-screen pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Case Timeline</h1>
          <p className="text-zinc-400 mt-2">Chronological view of all extracted events.</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search events..."
            className="pl-10 bg-zinc-900/50 border-zinc-800 text-zinc-200 focus-visible:ring-zinc-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-zinc-800 to-transparent md:-translate-x-1/2" />

        <div className="space-y-12">
          {loading ? (
            <div className="text-center py-20 text-zinc-500">Loading events...</div>
          ) : !user ? (
             <div className="text-center py-20 text-zinc-500">Please sign in to view timeline.</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 border border-dashed border-zinc-800 rounded-lg bg-zinc-900/20">
              No events found. Connect a data source and process files to generate the timeline.
            </div>
          ) : (
            filteredEvents.map((event, index) => (
              <div key={event.id} className={`relative flex items-center md:justify-between ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                
                {/* Date Marker */}
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 shadow-xl z-10">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                </div>

                {/* Content Card */}
                <div className={`ml-12 md:ml-0 w-full md:w-[calc(50%-2rem)] group`}>
                  <Card className="border-zinc-800 bg-zinc-900/90 hover:bg-zinc-900/95 transition-all duration-300 hover:border-zinc-700 hover:translate-y-[-2px] hover:shadow-2xl hover:shadow-black/50 backdrop-blur-md">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-indigo-400" />
                          <span className="font-mono text-sm text-indigo-300 font-medium">
                            {format(new Date(event.date), 'MMMM d, yyyy')}
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-zinc-500 hover:text-white hover:bg-zinc-800"
                          onClick={() => handleInspectDocument(event.fileId)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <p className="text-zinc-200 text-sm leading-relaxed mb-4">
                        {event.description}
                      </p>

                      <div className="flex items-center gap-2 pt-3 border-t border-zinc-800/50">
                        <FileText className="w-3 h-3 text-zinc-500" />
                        <span className="text-xs text-zinc-500 font-mono truncate max-w-[200px]">
                          Source: {event.fileId}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <DocumentInspector 
        isOpen={isInspectorOpen} 
        onClose={() => setIsInspectorOpen(false)} 
        docData={selectedDoc} 
      />
    </div>
  );
}
