import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { HardDrive, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export default function ConnectDrive() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleConnect = async () => {
    setStatus('connecting');
    // Mock connection for now since we don't have real OAuth set up in this environment
    setTimeout(() => {
      setStatus('success');
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 min-h-screen pb-20">
      <div>
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Connect Data Source</h1>
        <p className="text-zinc-400 mt-2 text-lg">Link your Google Drive to import case files.</p>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/90 backdrop-blur-md overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <HardDrive className="h-6 w-6" />
            </div>
            Google Drive Integration
          </CardTitle>
          <CardDescription className="text-zinc-400 text-base">
            Grant read-only access to your case folder. We will index the files and process them securely.
            Original files are never modified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800 text-sm text-zinc-400">
            <h4 className="font-medium text-zinc-300 mb-2">What happens next?</h4>
            <ul className="space-y-2 list-disc list-inside">
              <li>We scan for PDF, Word, and Image files.</li>
              <li>OCR is performed on scanned documents.</li>
              <li>AI extracts entities, events, and summaries.</li>
              <li>Data is encrypted and stored securely.</li>
            </ul>
          </div>

          {status === 'idle' && (
            <Button onClick={handleConnect} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg shadow-lg shadow-blue-500/20">
              Connect Google Drive
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
          
          {status === 'connecting' && (
            <Button disabled className="w-full bg-zinc-800 text-zinc-400 h-12 text-lg">
              Connecting...
            </Button>
          )}

          {status === 'success' && (
            <Alert className="bg-emerald-950/30 border-emerald-900/50 text-emerald-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <AlertTitle className="text-emerald-300 font-medium">Connected Successfully</AlertTitle>
              <AlertDescription className="text-emerald-400/80">
                Your Google Drive is now linked. You can select folders to index in the Files tab.
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert variant="destructive" className="bg-red-950/30 border-red-900/50 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-medium">Connection Failed</AlertTitle>
              <AlertDescription className="text-red-400/80">{errorMsg}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
