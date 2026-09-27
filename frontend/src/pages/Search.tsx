import React, { useState } from 'react';
import { useSearch } from '../hooks/search';
import { Search as SearchIcon, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useProjects } from '../hooks/projects';

export default function Search() {
  const [query, setQuery] = useState('');
  const searchMutation = useSearch();
  const { data: projects } = useProjects();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    searchMutation.mutate(query);
  };

  const getProjectName = (projectId: string) => {
    const p = projects?.find(x => x.id === projectId);
    return p ? p.name : 'Unknown Project';
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <header className="px-8 py-8 bg-white border-b border-gray-200">
        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight text-center mb-6">Search your evidence</h1>
        
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Show road construction activity in Zone 4..."
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900"
          />
          <button 
            type="submit"
            disabled={searchMutation.isPending || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-2 px-4 shadow-none disabled:opacity-50 flex items-center gap-2"
          >
            {searchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </form>
      </header>

      <div className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {searchMutation.isPending && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        )}

        {searchMutation.isSuccess && searchMutation.data.length === 0 && (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-lg border-dashed">
            <SearchIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No matching evidence found</h3>
            <p className="text-gray-500 mt-1 text-sm">
              Try rephrasing your semantic query or using different keywords.
            </p>
          </div>
        )}

        {searchMutation.isSuccess && searchMutation.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {searchMutation.data.map(result => (
              <div key={result.asset_id} className="card flex flex-col group">
                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                  <img 
                    src={result.cloudinary_url} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                  <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs font-medium rounded backdrop-blur-sm">
                    {Math.round(result.score * 100)}% match
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-xs font-semibold text-primary-600 mb-1 uppercase tracking-wider">
                    {getProjectName(result.project_id)}
                  </p>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">{result.activity}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{result.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}