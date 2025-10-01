// src/app/admin/knowledge/page.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  Upload, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  Edit, 
  Plus,
  FileText,
  Database,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from "lucide-react";

type KnowledgeEntry = {
  id: string;
  title: string;
  category: string | null;
  facility_id: string | null;
  state: string | null;
  content: string;
  source_url: string | null;
  last_updated: string;
  created_at: string;
};

type UploadResult = {
  success: boolean;
  message: string;
  inserted?: number;
};

export default function AdminKnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedState, setSelectedState] = useState("");
  
  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  
  // Add new entry modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);
  const [newEntry, setNewEntry] = useState({
    title: "",
    category: "",
    state: "",
    content: "",
    source_url: "",
    facility_id: ""
  });

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [entries, searchQuery, selectedCategory, selectedState]);

  async function loadEntries() {
    try {
      const response = await fetch("/api/admin/knowledge");
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries || []);
      }
    } catch (error) {
      console.error("Failed to load knowledge entries:", error);
      // Set empty array instead of mock data
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  function filterEntries() {
    let filtered = entries;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        entry =>
          entry.title.toLowerCase().includes(query) ||
          entry.content.toLowerCase().includes(query) ||
          entry.category?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(entry => entry.category === selectedCategory);
    }

    if (selectedState) {
      filtered = filtered.filter(entry => entry.state === selectedState);
    }

    setFilteredEntries(filtered);
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append("files", file);
    });

    // Add metadata
    formData.append("category", selectedCategory || "General");
    formData.append("state", selectedState || "");
    formData.append("facility_id", "");

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      setUploadResult({
        success: response.ok,
        message: result.ok 
          ? `Successfully uploaded ${result.inserted} entries`
          : result.error || "Upload failed",
        inserted: result.inserted
      });

      if (response.ok) {
        loadEntries(); // Reload entries
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: "Network error during upload"
      });
    } finally {
      setUploading(false);
      // Clear file input
      event.target.value = "";
    }
  }

  async function handleAddEntry() {
    if (!newEntry.title || !newEntry.content) return;

    try {
      const response = await fetch("/api/admin/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry)
      });

      if (response.ok) {
        loadEntries();
        setShowAddModal(false);
        setNewEntry({
          title: "",
          category: "",
          state: "",
          content: "",
          source_url: "",
          facility_id: ""
        });
      }
    } catch (error) {
      console.error("Failed to add entry:", error);
    }
  }

  async function handleDeleteEntry(id: string) {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      const response = await fetch(`/api/admin/knowledge/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setEntries(entries.filter(entry => entry.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  }

  const categories = [...new Set(entries.map(e => e.category).filter(Boolean))];
  const states = [...new Set(entries.map(e => e.state).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Knowledge Base Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage regulations, policies, and documentation</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      </div>

      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Upload className="h-5 w-5" />
          Upload Documents
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">Select Category</option>
            <option value="CMS">CMS Regulations</option>
            <option value="State">State Regulations</option>
            <option value="Joint Commission">Joint Commission</option>
            <option value="CDC">CDC Guidelines</option>
            <option value="Policy">Facility Policies</option>
          </select>
          
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All States (Default)</option>
            <option value="AL">Alabama</option>
            <option value="AK">Alaska</option>
            <option value="AZ">Arizona</option>
            <option value="AR">Arkansas</option>
            <option value="CA">California</option>
            <option value="CO">Colorado</option>
            <option value="CT">Connecticut</option>
            <option value="DE">Delaware</option>
            <option value="FL">Florida</option>
            <option value="GA">Georgia</option>
            <option value="HI">Hawaii</option>
            <option value="ID">Idaho</option>
            <option value="IL">Illinois</option>
            <option value="IN">Indiana</option>
            <option value="IA">Iowa</option>
            <option value="KS">Kansas</option>
            <option value="KY">Kentucky</option>
            <option value="LA">Louisiana</option>
            <option value="ME">Maine</option>
            <option value="MD">Maryland</option>
            <option value="MA">Massachusetts</option>
            <option value="MI">Michigan</option>
            <option value="MN">Minnesota</option>
            <option value="MS">Mississippi</option>
            <option value="MO">Missouri</option>
            <option value="MT">Montana</option>
            <option value="NE">Nebraska</option>
            <option value="NV">Nevada</option>
            <option value="NH">New Hampshire</option>
            <option value="NJ">New Jersey</option>
            <option value="NM">New Mexico</option>
            <option value="NY">New York</option>
            <option value="NC">North Carolina</option>
            <option value="ND">North Dakota</option>
            <option value="OH">Ohio</option>
            <option value="OK">Oklahoma</option>
            <option value="OR">Oregon</option>
            <option value="PA">Pennsylvania</option>
            <option value="RI">Rhode Island</option>
            <option value="SC">South Carolina</option>
            <option value="SD">South Dakota</option>
            <option value="TN">Tennessee</option>
            <option value="TX">Texas</option>
            <option value="UT">Utah</option>
            <option value="VT">Vermont</option>
            <option value="VA">Virginia</option>
            <option value="WA">Washington</option>
            <option value="WV">West Virginia</option>
            <option value="WI">Wisconsin</option>
            <option value="WY">Wyoming</option>
            <option value="DC">District of Columbia</option>
            <option value="PR">Puerto Rico</option>
            <option value="VI">US Virgin Islands</option>
            <option value="GU">Guam</option>
            <option value="AS">American Samoa</option>
            <option value="MP">Northern Mariana Islands</option>
          </select>
          
          <div className="relative">
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileUpload}
              disabled={uploading}
              className="w-full border rounded-lg px-3 py-2 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
            />
          </div>
        </div>

        {uploading && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Processing files...</span>
          </div>
        )}

        {uploadResult && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            uploadResult.success 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {uploadResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span>{uploadResult.message}</span>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All States</option>
            <option value="AL">Alabama</option>
            <option value="AK">Alaska</option>
            <option value="AZ">Arizona</option>
            <option value="AR">Arkansas</option>
            <option value="CA">California</option>
            <option value="CO">Colorado</option>
            <option value="CT">Connecticut</option>
            <option value="DE">Delaware</option>
            <option value="FL">Florida</option>
            <option value="GA">Georgia</option>
            <option value="HI">Hawaii</option>
            <option value="ID">Idaho</option>
            <option value="IL">Illinois</option>
            <option value="IN">Indiana</option>
            <option value="IA">Iowa</option>
            <option value="KS">Kansas</option>
            <option value="KY">Kentucky</option>
            <option value="LA">Louisiana</option>
            <option value="ME">Maine</option>
            <option value="MD">Maryland</option>
            <option value="MA">Massachusetts</option>
            <option value="MI">Michigan</option>
            <option value="MN">Minnesota</option>
            <option value="MS">Mississippi</option>
            <option value="MO">Missouri</option>
            <option value="MT">Montana</option>
            <option value="NE">Nebraska</option>
            <option value="NV">Nevada</option>
            <option value="NH">New Hampshire</option>
            <option value="NJ">New Jersey</option>
            <option value="NM">New Mexico</option>
            <option value="NY">New York</option>
            <option value="NC">North Carolina</option>
            <option value="ND">North Dakota</option>
            <option value="OH">Ohio</option>
            <option value="OK">Oklahoma</option>
            <option value="OR">Oregon</option>
            <option value="PA">Pennsylvania</option>
            <option value="RI">Rhode Island</option>
            <option value="SC">South Carolina</option>
            <option value="SD">South Dakota</option>
            <option value="TN">Tennessee</option>
            <option value="TX">Texas</option>
            <option value="UT">Utah</option>
            <option value="VT">Vermont</option>
            <option value="VA">Virginia</option>
            <option value="WA">Washington</option>
            <option value="WV">West Virginia</option>
            <option value="WI">Wisconsin</option>
            <option value="WY">Wyoming</option>
            <option value="DC">District of Columbia</option>
            <option value="PR">Puerto Rico</option>
            <option value="VI">US Virgin Islands</option>
            <option value="GU">Guam</option>
            <option value="AS">American Samoa</option>
            <option value="MP">Northern Mariana Islands</option>
          </select>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredEntries.length} of {entries.length} entries
        </p>
      </div>

      {/* Entries List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">State</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {entry.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {entry.content.slice(0, 120)}...
                        </p>
                        {entry.source_url && (
                          <a 
                            href={entry.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 mt-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Source
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {entry.category && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {entry.category}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {entry.state && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        {entry.state}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(entry.last_updated).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedEntry(entry)}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No entries found. Try adjusting your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Add New Knowledge Entry</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={newEntry.title}
                    onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Enter title..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={newEntry.category}
                      onChange={(e) => setNewEntry({...newEntry, category: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Select Category</option>
                      <option value="CMS">CMS Regulations</option>
                      <option value="State">State Regulations</option>
                      <option value="Joint Commission">Joint Commission</option>
                      <option value="CDC">CDC Guidelines</option>
                      <option value="MDS Manuals">MDS Manuals</option>
                      <option value="Policy">Facility Policies</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <select
                      value={newEntry.state}
                      onChange={(e) => setNewEntry({...newEntry, state: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Select State</option>
                      <option value="CA">California</option>
                      <option value="TX">Texas</option>
                      <option value="FL">Florida</option>
                      <option value="NY">New York</option>
                      <option value="PA">Pennsylvania</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source URL</label>
                  <input
                    type="url"
                    value={newEntry.source_url}
                    onChange={(e) => setNewEntry({...newEntry, source_url: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="https://..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    value={newEntry.content}
                    onChange={(e) => setNewEntry({...newEntry, content: e.target.value})}
                    rows={8}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Enter the regulation or policy content..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEntry}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Entry Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{selectedEntry.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    {selectedEntry.category && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {selectedEntry.category}
                      </span>
                    )}
                    {selectedEntry.state && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {selectedEntry.state}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="prose max-w-none">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm">{selectedEntry.content}</pre>
                </div>
                
                {selectedEntry.source_url && (
                  <div className="mt-4">
                    <a 
                      href={selectedEntry.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Original Source
                    </a>
                  </div>
                )}
                
                <div className="mt-4 text-sm text-gray-500">
                  <p>Last updated: {new Date(selectedEntry.last_updated).toLocaleString()}</p>
                  <p>Created: {new Date(selectedEntry.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}