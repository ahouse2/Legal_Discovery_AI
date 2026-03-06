import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Calendar, Tag, Database, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  docData: {
    id: string;
    name: string;
    summary?: string;
    topics?: string[];
    cypherStatements?: string[];
    webViewLink?: string;
  } | null;
}

export default function DocumentInspector({ isOpen, onClose, docData }: DocumentInspectorProps) {
  if (!isOpen || !docData) return null;

  const handleExportCypher = () => {
    if (!docData.cypherStatements) return;
    const cypher = docData.cypherStatements.join('\n');
    const blob = new Blob([cypher], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${docData.name.replace(/\s+/g, '_')}_graph.cypher`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6 space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-white leading-tight">{docData.name}</h2>
                  <p className="text-zinc-500 font-mono text-sm">{docData.id}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-400 hover:text-white">
                  <X className="h-6 w-6" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                  <div className="flex items-center gap-2 mb-4 text-indigo-400">
                    <FileText className="h-5 w-5" />
                    <h3 className="font-semibold">Summary</h3>
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    {docData.summary || "No summary available."}
                  </p>
                </div>

                {docData.topics && docData.topics.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4 text-emerald-400">
                      <Tag className="h-5 w-5" />
                      <h3 className="font-semibold">Identified Topics</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {docData.topics.map((topic, i) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-900 text-sm">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {docData.cypherStatements && docData.cypherStatements.length > 0 && (
                  <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-violet-400">
                        <Database className="h-5 w-5" />
                        <h3 className="font-semibold">Graph Data</h3>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleExportCypher}
                        className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Cypher
                      </Button>
                    </div>
                    <div className="bg-black rounded-lg p-4 font-mono text-xs text-zinc-500 overflow-x-auto border border-zinc-900">
                      <pre>{docData.cypherStatements.slice(0, 3).join('\n')}</pre>
                      {docData.cypherStatements.length > 3 && (
                        <p className="mt-2 italic opacity-50">...and {docData.cypherStatements.length - 3} more statements</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
