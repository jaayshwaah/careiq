"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Scan, 
  Plus, 
  Minus, 
  Search, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Truck,
  ArrowLeftRight,
  BarChart3,
  Settings,
  Camera,
  ShoppingCart,
  Building2,
  Clock,
  User,
  MapPin
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';

interface SupplyItem {
  id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  unit_of_measure: string;
  cost_per_unit?: number;
  reorder_level: number;
  category: {
    name: string;
    color: string;
  };
  current_stock?: number;
}

interface FacilityUnit {
  id: string;
  name: string;
  unit_code: string;
  floor_number?: number;
  unit_type: string;
}

interface Transaction {
  item_name: string;
  quantity: number;
  from_location: string;
  to_location: string;
  performed_by: string;
  transaction_date: string;
}

export default function SupplyManagementPage() {
  const { isAuthenticated, user } = useAuth();
  const supabase = getBrowserSupabase();
  const scannerRef = useRef<HTMLInputElement>(null);

  // State management
  const [activeTab, setActiveTab] = useState<'stock' | 'transfer' | 'scan' | 'reports'>('stock');
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([]);
  const [facilityUnits, setFacilityUnits] = useState<FacilityUnit[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('central_supply');
  
  // Transfer state
  const [transferMode, setTransferMode] = useState<'stock_in' | 'stock_out' | 'transfer'>('stock_out');
  const [selectedItem, setSelectedItem] = useState<SupplyItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [fromLocation, setFromLocation] = useState('central_supply');
  const [toLocation, setToLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadSupplyData();
    }
  }, [isAuthenticated]);

  const loadSupplyData = async () => {
    try {
      setLoading(true);
      
      // Load supply items with current stock
      const { data: items, error: itemsError } = await supabase
        .from('supply_items')
        .select(`
          *,
          category:supply_categories(name, color),
          stock:supply_stock!inner(current_quantity)
        `)
        .eq('is_active', true)
        .eq('supply_stock.location_type', selectedUnit === 'central_supply' ? 'central_supply' : 'unit_stock')
        .eq('supply_stock.location_id', selectedUnit === 'central_supply' ? null : selectedUnit);

      if (itemsError) throw itemsError;

      const processedItems = items?.map(item => ({
        ...item,
        current_stock: item.stock?.[0]?.current_quantity || 0
      })) || [];

      setSupplyItems(processedItems);

      // Load facility units
      const { data: units, error: unitsError } = await supabase
        .from('facility_units')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (unitsError) throw unitsError;
      setFacilityUnits(units || []);

      // Load recent transactions
      const { data: transactions, error: transError } = await supabase
        .from('supply_transactions')
        .select(`
          *,
          item:supply_items(name),
          performer:profiles(full_name)
        `)
        .order('transaction_date', { ascending: false })
        .limit(10);

      if (transError) throw transError;
      
      const processedTransactions = transactions?.map(t => ({
        item_name: t.item?.name || 'Unknown Item',
        quantity: t.quantity,
        from_location: t.from_location_type === 'central_supply' ? 'Central Supply' : `Unit ${t.from_location_id}`,
        to_location: t.to_location_type === 'central_supply' ? 'Central Supply' : `Unit ${t.to_location_id}`,
        performed_by: t.performer?.full_name || 'Unknown User',
        transaction_date: new Date(t.transaction_date).toLocaleDateString()
      })) || [];

      setRecentTransactions(processedTransactions);

    } catch (error) {
      console.error('Error loading supply data:', error);
      setMessage({ type: 'error', text: 'Failed to load supply data' });
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeSearch = async (barcode: string) => {
    if (!barcode.trim()) return;

    const item = supplyItems.find(item => 
      item.barcode === barcode || 
      item.sku === barcode ||
      item.name.toLowerCase().includes(barcode.toLowerCase())
    );

    if (item) {
      setSelectedItem(item);
      setActiveTab('transfer');
      setMessage({ type: 'success', text: `Found: ${item.name}` });
    } else {
      setMessage({ type: 'error', text: 'Item not found' });
    }
  };

  const handleTransaction = async () => {
    if (!selectedItem || !toLocation) {
      setMessage({ type: 'error', text: 'Please select an item and destination' });
      return;
    }

    try {
      const transactionData = {
        item_id: selectedItem.id,
        transaction_type: transferMode,
        quantity: transferMode === 'stock_out' ? -quantity : quantity,
        from_location_type: fromLocation === 'central_supply' ? 'central_supply' : 'unit_stock',
        from_location_id: fromLocation === 'central_supply' ? null : fromLocation,
        to_location_type: toLocation === 'central_supply' ? 'central_supply' : 'unit_stock',
        to_location_id: toLocation === 'central_supply' ? null : toLocation,
        notes,
        performed_by: user?.id
      };

      const { error } = await supabase
        .from('supply_transactions')
        .insert(transactionData);

      if (error) throw error;

      // Update stock levels
      await updateStockLevels();

      setMessage({ type: 'success', text: 'Transaction completed successfully' });
      setSelectedItem(null);
      setQuantity(1);
      setNotes('');
      loadSupplyData();

    } catch (error) {
      console.error('Transaction error:', error);
      setMessage({ type: 'error', text: 'Failed to complete transaction' });
    }
  };

  const updateStockLevels = async () => {
    // This would update the supply_stock table based on the transaction
    // Implementation depends on your specific business logic
  };

  const filteredItems = supplyItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Authentication Required</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Please log in to access supply management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Header optimized for iPad */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Supply Management</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Central Supply & Unit Tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="central_supply">Central Supply</option>
              {facilityUnits.map(unit => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </select>
            <button
              onClick={loadSupplyData}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation - Large buttons for iPad */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'stock', label: 'Inventory', icon: Package },
            { id: 'transfer', label: 'Transfer', icon: ArrowLeftRight },
            { id: 'scan', label: 'Barcode', icon: Scan },
            { id: 'reports', label: 'Reports', icon: BarChart3 }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`p-4 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-current opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'stock' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Current Inventory</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedItem(item);
                    setActiveTab('transfer');
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {item.sku}</p>
                    </div>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.category.color }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                      {item.category.name}
                    </span>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        (item.current_stock || 0) <= item.reorder_level 
                          ? 'text-red-600' 
                          : 'text-green-600'
                      }`}>
                        {item.current_stock || 0}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.unit_of_measure}</div>
                    </div>
                  </div>
                  
                  {(item.current_stock || 0) <= item.reorder_level && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="h-3 w-3" />
                      Low Stock
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'transfer' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Stock Transfer</h2>
          
          {/* Transfer Type Selection */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { id: 'stock_out', label: 'Take Out', icon: Minus, color: 'red' },
              { id: 'stock_in', label: 'Stock In', icon: Plus, color: 'green' },
              { id: 'transfer', label: 'Transfer', icon: ArrowLeftRight, color: 'blue' }
            ].map(mode => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => setTransferMode(mode.id as any)}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                    transferMode === mode.id
                      ? `border-${mode.color}-500 bg-${mode.color}-50 text-${mode.color}-700 dark:bg-${mode.color}-900 dark:text-${mode.color}-300`
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="font-medium">{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Item Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Item
                </label>
                <select
                  value={selectedItem?.id || ''}
                  onChange={(e) => {
                    const item = supplyItems.find(i => i.id === e.target.value);
                    setSelectedItem(item || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Choose an item...</option>
                  {supplyItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} (Stock: {item.current_stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                    min="1"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {transferMode === 'stock_out' ? 'To Unit' : transferMode === 'stock_in' ? 'From' : 'To Location'}
                </label>
                <select
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select location...</option>
                  <option value="central_supply">Central Supply</option>
                  {facilityUnits.map(unit => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this transaction..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>

              <button
                onClick={handleTransaction}
                disabled={!selectedItem || !toLocation}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Complete Transaction
              </button>
            </div>

            {/* Selected Item Preview */}
            {selectedItem && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Selected Item</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Name:</span> {selectedItem.name}</p>
                  <p><span className="font-medium">SKU:</span> {selectedItem.sku}</p>
                  <p><span className="font-medium">Current Stock:</span> {selectedItem.current_stock} {selectedItem.unit_of_measure}</p>
                  <p><span className="font-medium">Category:</span> {selectedItem.category.name}</p>
                  {selectedItem.description && (
                    <p><span className="font-medium">Description:</span> {selectedItem.description}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'scan' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Barcode Scanner</h2>
          
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center">
              <div className="mx-auto w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                <Scan className="h-16 w-16 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Scan a barcode or enter item code manually
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Barcode / Item Code
              </label>
              <input
                ref={scannerRef}
                type="text"
                placeholder="Scan or type barcode..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleBarcodeSearch(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                autoFocus
              />
            </div>

            <button
              onClick={() => {
                if (scannerRef.current) {
                  handleBarcodeSearch(scannerRef.current.value);
                  scannerRef.current.value = '';
                }
              }}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Search Item
            </button>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p>Tip: Focus on the input field above and scan with your barcode scanner</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Recent Transactions</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">From</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentTransactions.map((transaction, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{transaction.item_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{Math.abs(transaction.quantity)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{transaction.from_location}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{transaction.to_location}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{transaction.performed_by}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{transaction.transaction_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
