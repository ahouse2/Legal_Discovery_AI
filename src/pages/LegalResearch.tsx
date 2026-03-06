import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Gavel, Scale, BookOpen, Loader2, ExternalLink, Download, Database, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CaseLaw {
  id: string;
  caseName: string;
  citation: string;
  court: string;
  dateFiled: string;
  summary: string;
  source: 'CourtListener' | 'JudyRecords' | 'Leginfo';
  relevance: number;
}

const CA_CODES = [
  { id: 'FAM', label: 'Family Code' },
  { id: 'CIV', label: 'Civil Code' },
  { id: 'EVID', label: 'Evidence Code' },
  { id: 'CCP', label: 'Code of Civil Procedure' },
  { id: 'HSC', label: 'Health & Safety Code' },
  { id: 'BPC', label: 'Business & Professions Code' },
];

export default function LegalResearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CaseLaw[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'cases' | 'statutes'>('all');
  
  // Scrape state
  const [scraping, setScraping] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<string[]>(['FAM']);
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/research/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Failed to search legal databases', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    if (selectedCodes.length === 0) return;
    setScraping(true);
    setScrapeStatus('Initializing scrape...');
    try {
      const res = await fetch('/api/research/scrape-leginfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: selectedCodes })
      });
      const data = await res.json();
      setScrapeStatus(`Scraped ${data.count} sections successfully.`);
    } catch (err) {
      console.error('Scrape failed', err);
      setScrapeStatus('Scrape failed. Check console.');
    } finally {
      setScraping(false);
    }
  };

  const toggleCode = (codeId: string) => {
    setSelectedCodes(prev => 
      prev.includes(codeId) ? prev.filter(c => c !== codeId) : [...prev, codeId]
    );
  };

  const handleExport = () => {
    const jsonString = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "legal_research_results.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredResults = activeTab === 'all' 
    ? results 
    : results.filter(r => activeTab === 'cases' ? r.source !== 'Leginfo' : r.source === 'Leginfo');

  return (
    <div className="space-y-8 min-h-screen pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Legal Research</h1>
          <p className="text-zinc-400 mt-2 text-lg">AI-powered case law and statute discovery across multiple jurisdictions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={results.length === 0} className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800">
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-zinc-800 bg-zinc-900/90 backdrop-blur-md">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
                  <Input
                    placeholder="Search for legal concepts (e.g., 'attorney misconduct')..."
                    className="pl-10 h-12 bg-zinc-950/50 border-zinc-800 text-lg focus-visible:ring-zinc-700"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button 
                  size="lg" 
                  onClick={handleSearch} 
                  disabled={loading}
                  className="bg-white text-black hover:bg-zinc-200 font-medium px-8"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Search"}
                </Button>
              </div>
              
              <div className="flex gap-2 mt-4">
                {['Attorney Misconduct', 'Judicial Bias', 'Fraud on the Court', 'Discovery Abuse'].map((topic) => (
                  <Button 
                    key={topic} 
                    variant="ghost" 
                    size="sm" 
                    className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full text-xs border border-zinc-800"
                    onClick={() => setQuery(topic)}
                  >
                    {topic}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 border-b border-zinc-800 pb-1">
            <button 
              onClick={() => setActiveTab('all')}
              className={`pb-3 px-1 text-sm font-medium transition-colors ${activeTab === 'all' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              All Results
            </button>
            <button 
              onClick={() => setActiveTab('cases')}
              className={`pb-3 px-1 text-sm font-medium transition-colors ${activeTab === 'cases' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Case Law
            </button>
            <button 
              onClick={() => setActiveTab('statutes')}
              className={`pb-3 px-1 text-sm font-medium transition-colors ${activeTab === 'statutes' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Statutes & Codes
            </button>
          </div>

          <div className="grid gap-6">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20 text-zinc-500"
                >
                  <Loader2 className="h-10 w-10 animate-spin mb-4 text-zinc-400" />
                  <p>Scraping legal databases...</p>
                </motion.div>
              ) : filteredResults.length === 0 && !loading ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="text-center py-20 text-zinc-500 border border-dashed border-zinc-800 rounded-lg bg-zinc-900/20"
                >
                  <Scale className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No results found. Try a broader search term.</p>
                </motion.div>
              ) : (
                filteredResults.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-zinc-800 bg-zinc-900/90 hover:bg-zinc-900/95 transition-colors group backdrop-blur-md">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                              {result.source === 'Leginfo' ? <BookOpen className="h-3 w-3" /> : <Gavel className="h-3 w-3" />}
                              {result.source} • {result.dateFiled}
                            </div>
                            <CardTitle className="text-xl font-semibold text-zinc-100 group-hover:text-white transition-colors">
                              {result.caseName}
                            </CardTitle>
                            <CardDescription className="text-zinc-400 font-mono text-xs">
                              {result.citation} • {result.court}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              result.relevance > 80 ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 
                              result.relevance > 50 ? 'bg-yellow-950 text-yellow-400 border border-yellow-900' : 
                              'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}>
                              {result.relevance}% Match
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-zinc-300 text-sm leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                          {result.summary}
                        </p>
                        <div className="mt-4 flex justify-end">
                          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                            View Full Text <ExternalLink className="h-3 w-3 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-zinc-800 bg-zinc-900/90 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-400" />
                Graph Database Ingestion
              </CardTitle>
              <CardDescription>
                Scrape and upload California Codes to Neo4j.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Select Codes</Label>
                <div className="grid grid-cols-1 gap-2">
                  {CA_CODES.map((code) => (
                    <div key={code.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={code.id} 
                        checked={selectedCodes.includes(code.id)}
                        onCheckedChange={() => toggleCode(code.id)}
                        className="border-zinc-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                      <label
                        htmlFor={code.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-300"
                      >
                        {code.label} ({code.id})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" 
                onClick={handleScrape}
                disabled={scraping || selectedCodes.length === 0}
              >
                {scraping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                {scraping ? 'Scraping...' : 'Start Ingestion'}
              </Button>
              
              {scrapeStatus && (
                <div className="p-3 rounded bg-zinc-950/50 border border-zinc-800 text-xs font-mono text-zinc-400">
                  {scrapeStatus}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
