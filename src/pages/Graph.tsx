import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import { db, auth } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface Entity {
  id: string;
  name: string;
  type: string;
  fileId: string;
}

interface GraphData {
  nodes: { id: string; group: number; val: number; type: string }[];
  links: { source: string; target: string }[];
}

export default function Graph() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight
      });
    }
    
    // Resize observer
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height
        });
      }
    });
    
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'entities'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entitiesData: Entity[] = [];
      snapshot.forEach((doc) => {
        entitiesData.push({ id: doc.id, ...doc.data() } as Entity);
      });
      setEntities(entitiesData);
      processGraphData(entitiesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching entities:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const processGraphData = (data: Entity[]) => {
    // Create nodes
    const nodes = data.map(e => ({
      id: e.name,
      group: e.type === 'PERSON' ? 1 : e.type === 'ORGANIZATION' ? 2 : 3,
      val: e.type === 'PERSON' ? 2 : 1.5,
      type: e.type
    }));

    // Create links between entities in the same file
    // This implies they are related because they appear in the same document context
    const links: { source: string; target: string }[] = [];
    const entitiesByFile: Record<string, Entity[]> = {};
    
    data.forEach(e => {
      if (!entitiesByFile[e.fileId]) entitiesByFile[e.fileId] = [];
      entitiesByFile[e.fileId].push(e);
    });

    Object.values(entitiesByFile).forEach(fileEntities => {
      for (let i = 0; i < fileEntities.length; i++) {
        for (let j = i + 1; j < fileEntities.length; j++) {
          links.push({
            source: fileEntities[i].name,
            target: fileEntities[j].name
          });
        }
      }
    });

    // Deduplicate nodes
    const uniqueNodes = Array.from(new Map(nodes.map(item => [item.id, item])).values());
    
    // Deduplicate links
    const uniqueLinks = Array.from(new Set(links.map(l => JSON.stringify([l.source, l.target].sort()))))
      .map(s => {
        const [source, target] = JSON.parse(s);
        return { source, target };
      });

    setGraphData({ nodes: uniqueNodes, links: uniqueLinks });
  };

  const handleExportCypher = () => {
    let cypher = '// Exported from Legal Discovery AI\n';
    // Generate MERGE statements for nodes to avoid duplicates
    graphData.nodes.forEach(node => {
      const label = node.type === 'PERSON' ? 'Person' : node.type === 'ORGANIZATION' ? 'Organization' : 'Location';
      cypher += `MERGE (:Entity:${label} {name: "${node.id}"});\n`;
    });
    // Generate relationships
    graphData.links.forEach(link => {
      const source = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const target = typeof link.target === 'object' ? (link.target as any).id : link.target;
      cypher += `MATCH (a:Entity {name: "${source}"}), (b:Entity {name: "${target}"}) MERGE (a)-[:RELATED_TO]->(b);\n`;
    });
    
    const blob = new Blob([cypher], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'full_knowledge_graph.cypher';
    a.click();
  };

  return (
    <div className="space-y-8 h-[calc(100vh-12rem)] flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Knowledge Graph</h1>
          <p className="text-zinc-400 mt-2">Interactive visualization of entities and relationships.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => processGraphData(entities)} className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCypher} disabled={loading || graphData.nodes.length === 0} className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white">
            <Download className="h-4 w-4 mr-2" />
            Export Full Graph (Cypher)
          </Button>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
        <CardContent className="h-full p-0 relative" ref={containerRef}>
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
              <p>Loading graph data...</p>
            </div>
          ) : !user ? (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
              Please sign in to view knowledge graph.
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
              <p className="mb-4">No graph data available.</p>
              <p className="text-sm">Process files to extract entities and build the graph.</p>
            </div>
          ) : (
            <ForceGraph2D
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              nodeLabel="id"
              nodeAutoColorBy="group"
              linkDirectionalParticles={2}
              linkDirectionalParticleSpeed={0.005}
              backgroundColor="#09090b"
              nodeRelSize={6}
              linkColor={() => "#3f3f46"}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const label = node.id as string;
                const fontSize = 12/globalScale;
                ctx.font = `${fontSize}px Sans-Serif`;
                const textWidth = ctx.measureText(label).width;
                const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillRect(node.x! - bckgDimensions[0] / 2, node.y! - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Color based on group
                if (node.group === 1) ctx.fillStyle = '#818cf8'; // Person - Indigo
                else if (node.group === 2) ctx.fillStyle = '#34d399'; // Org - Emerald
                else ctx.fillStyle = '#fbbf24'; // Location - Amber

                ctx.fillText(label, node.x!, node.y!);

                node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
