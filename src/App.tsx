import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ConnectDrive from './pages/ConnectDrive';
import Timeline from './pages/Timeline';
import Graph from './pages/Graph';
import Files from './pages/Files';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="connect" element={<ConnectDrive />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="graph" element={<Graph />} />
          <Route path="files" element={<Files />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
