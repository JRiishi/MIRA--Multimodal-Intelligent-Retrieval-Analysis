import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
import BootGate from './components/BootGate';
import { useProjects } from './hooks/projects';
import { useMediaLibrary } from './hooks/media';

import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import MediaLibrary from './pages/MediaLibrary';
import Search from './pages/Search';
import NeedsReview from './pages/NeedsReview';
import Reports from './pages/Reports';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 2_000,
    },
  },
});

function Shell() {
  const projects = useProjects();
  const media = useMediaLibrary();
  const ready = !projects.isLoading && !media.isLoading;

  return (
    <BootGate ready={ready}>
      <Routes>
        {/* Dedicated Standalone Landing Page */}
        <Route path="/landing" element={<Landing />} />

        {/* Workspace App Layout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
          <Route path="/media" element={<MediaLibrary />} />
          <Route path="/search" element={<Search />} />
          <Route path="/review" element={<NeedsReview />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BootGate>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
