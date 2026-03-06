import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Activity, FileText, GitGraph, Clock, Scale, ArrowRight } from 'lucide-react';
import { db, auth } from '@/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function Dashboard() {
  const [stats, setStats] = useState({
    filesProcessed: 0,
    entitiesExtracted: 0,
    eventsFound: 0,
    storageUsed: '0 GB'
  });
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        const filesColl = collection(db, 'files');
        const entitiesColl = collection(db, 'entities');
        const eventsColl = collection(db, 'events');

        const filesQuery = query(filesColl, where('ownerId', '==', user.uid));
        const entitiesQuery = query(entitiesColl, where('ownerId', '==', user.uid));
        const eventsQuery = query(eventsColl, where('ownerId', '==', user.uid));

        const [filesSnapshot, entitiesSnapshot, eventsSnapshot] = await Promise.all([
          getCountFromServer(filesQuery),
          getCountFromServer(entitiesQuery),
          getCountFromServer(eventsQuery)
        ]);

        setStats({
          filesProcessed: filesSnapshot.data().count,
          entitiesExtracted: entitiesSnapshot.data().count,
          eventsFound: eventsSnapshot.data().count,
          storageUsed: '0.5 GB' // Mock for now
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, [user]);

  return (
    <div className="space-y-8 min-h-screen pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Case Overview</h1>
          <p className="text-zinc-400 mt-2 text-lg">Summary of processed evidence and analysis.</p>
        </div>
        <Link to="/connect">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
            Connect New Source
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900/90 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Files Processed</CardTitle>
            <FileText className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.filesProcessed}</div>
            <p className="text-xs text-zinc-500 mt-1">Indexed files</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/90 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Entities Extracted</CardTitle>
            <GitGraph className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.entitiesExtracted}</div>
            <p className="text-xs text-zinc-500 mt-1">People, Orgs, Locations</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/90 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Timeline Events</CardTitle>
            <Clock className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.eventsFound}</div>
            <p className="text-xs text-zinc-500 mt-1">Chronological data points</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/90 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">System Status</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">Active</div>
            <p className="text-xs text-zinc-500 mt-1">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-2 border-zinc-800 bg-zinc-900/90 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-zinc-500 text-center py-12 border border-dashed border-zinc-800 rounded-lg bg-zinc-950/30">
              {!user ? "Please sign in to view activity." : "No recent activity. Connect a Google Drive folder to begin."}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 border-zinc-800 bg-zinc-900/90 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link to="/research" className="block">
              <div className="group flex items-center justify-between p-4 rounded-lg border border-zinc-800 bg-zinc-950/50 hover:bg-zinc-800 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-indigo-500/10 text-indigo-400">
                    <Scale className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-zinc-200">Legal Research</div>
                    <div className="text-xs text-zinc-500">Search case law & statutes</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
              </div>
            </Link>
            
            <Link to="/files" className="block">
              <div className="group flex items-center justify-between p-4 rounded-lg border border-zinc-800 bg-zinc-950/50 hover:bg-zinc-800 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-zinc-200">Process Files</div>
                    <div className="text-xs text-zinc-500">Analyze new evidence</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
