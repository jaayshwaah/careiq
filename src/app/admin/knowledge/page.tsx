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
  CheckCircle
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
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base Management</h1>
          <p className="text-gray-600">Manage regulations, policies, and documentation</p>
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
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Documents
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border rounded-lg px-3 py-2"
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
            className="border rounded-lg px-3 py-2"
          >
            <option value="">Select State (Optional)</option>
            <option value="CA">California</option>
            <option value="TX">Texas</option>
            <option value="FL">Florida</option>
            <option value="NY">New York</option>
            <option value="PA">Pennsylvania</option>
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
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All States</option>
            {states.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        <p className="text-sm text-gray-600">
          Showing {filteredEntries.length} of {entries.length} entries
        </p>
      </div>

      {/* Entries List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50"></tr>