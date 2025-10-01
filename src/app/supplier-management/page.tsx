"use client";

import { useState, useEffect } from 'react';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthProvider';
import { 
  Plus, Upload, Eye, Edit, Trash2, CheckCircle, AlertTriangle, 
  Clock, Package, FileText, Settings, ExternalLink, RefreshCw,
  Search, Filter, Download, MoreHorizontal, ArrowRight, Zap
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  api_endpoint?: string;
  sync_enabled: boolean;
  sync_frequency: string;
  last_sync_at?: string;
  sync_status: string;
  error_message?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sync_logs?: Array<{
    id: string;
    sync_type: string;
    status: string;
    started_at: string;
    completed_at?: string;
    products_synced: number;
    products_updated: number;
    products_added: number;
    error_message?: string;
  }>;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  status: string;
  processing_status: string;
  file_type: string;
  created_at: string;
  supplier: {
    name: string;
    contact_name?: string;
  };
  items: Array<{
    id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    supplier_sku?: string;
    matched_product_id?: string;
    confidence_score?: number;
    needs_review: boolean;
    matched_product?: {
      name: string;
      sku: string;
    };
  }>;
}

export default function SupplierManagement() {
  const { isAuthenticated, user } = useAuth();
  const supabase = getBrowserSupabase();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setRefreshCwing] = useState<string | null>(null);
  
  // Modals
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeOnly, setActiveOnly] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadSuppliers();
      loadInvoices();
    }
  }, [isAuthenticated, user]);

  const loadSuppliers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/suppliers', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setSuppliers(result.suppliers || []);
      } else {
        console.error('Failed to load suppliers');
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/suppliers/invoices', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setInvoices(result.invoices || []);
      } else {
        console.error('Failed to load invoices');
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const syncSupplier = async (supplierId: string) => {
    try {
      setRefreshCwing(supplierId);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/suppliers/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ supplier_id: supplierId }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('RefreshCw completed:', result);
        await loadSuppliers();
      } else {
        const error = await response.json();
        console.error('RefreshCw failed:', error);
      }
    } catch (error) {
      console.error('Error syncing supplier:', error);
    } finally {
      setRefreshCwing(null);
    }
  };

  const getRefreshCwStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      case 'error': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      case 'syncing': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getRefreshCwStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      case 'syncing': return <RefreshCw className="h-4 w-4 animate-spin" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.contact_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = !activeOnly || supplier.is_active;
    return matchesSearch && matchesActive;
  });

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.supplier.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Access Required</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Please sign in to view supplier management</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Supplier Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Automated supplier integration and invoice processing
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload Invoice
            </button>
            <button
              onClick={() => setShowSupplierModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Supplier
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border">
            <div className="flex items-center gap-3 mb-2">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {suppliers.length}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Suppliers</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {suppliers.filter(s => s.sync_enabled).length}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Auto-RefreshCw Enabled</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-8 w-8 text-purple-600" />
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {invoices.length}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Invoices Processed</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="h-8 w-8 text-orange-600" />
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {invoices.filter(i => i.processing_status === 'completed').length}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Successfully Processed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Suppliers
          </button>
          <button className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            Invoices
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activeOnly"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="activeOnly" className="text-sm text-gray-700 dark:text-gray-300">
                Active only
              </label>
            </div>
          </div>
        </div>

        {/* Suppliers List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Suppliers ({filteredSuppliers.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredSuppliers.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No suppliers found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Get started by adding your first supplier.
                </p>
                <button
                  onClick={() => setShowSupplierModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Supplier
                </button>
              </div>
            ) : (
              filteredSuppliers.map((supplier) => (
                <div key={supplier.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {supplier.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRefreshCwStatusColor(supplier.sync_status)}`}>
                          <div className="flex items-center gap-1">
                            {getRefreshCwStatusIcon(supplier.sync_status)}
                            {supplier.sync_status}
                          </div>
                        </span>
                        {supplier.sync_enabled && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded-full text-xs font-medium">
                            Auto-RefreshCw
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                          <span className="font-medium">Contact:</span> {supplier.contact_name || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Email:</span> {supplier.email || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Phone:</span> {supplier.phone || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">RefreshCw Frequency:</span> {supplier.sync_frequency}
                        </div>
                        <div>
                          <span className="font-medium">Last RefreshCw:</span> {
                            supplier.last_sync_at 
                              ? new Date(supplier.last_sync_at).toLocaleDateString()
                              : 'Never'
                          }
                        </div>
                        <div>
                          <span className="font-medium">Status:</span> {
                            supplier.is_active ? 'Active' : 'Inactive'
                          }
                        </div>
                      </div>
                      
                      {supplier.error_message && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-sm text-red-700 dark:text-red-400">
                            <strong>Error:</strong> {supplier.error_message}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => syncSupplier(supplier.id)}
                        disabled={syncing === supplier.id || supplier.sync_status === 'syncing'}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {syncing === supplier.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        RefreshCw
                      </button>
                      
                      <button
                        onClick={() => setSelectedSupplier(supplier)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                      >
                        <Settings className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modals would go here - SupplierModal, InvoiceModal, etc. */}
      </div>
    </div>
  );
}
