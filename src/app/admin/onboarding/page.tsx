"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Plus,
  Calendar,
  Building,
  Mail,
  Phone,
  MapPin,
  Shield,
  Database,
  Key,
  Settings,
  Save,
  UserPlus
} from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabaseClient";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
}

interface ClientData {
  facilityName: string;
  facilityType: 'skilled_nursing' | 'assisted_living' | 'memory_care' | 'independent_living';
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
  licenseNumber: string;
  medicareNumber: string;
  medicaidNumber: string;
  bedCount: number;
  staffCount: number;
  contractStartDate: string;
  contractEndDate: string;
  planType: 'basic' | 'professional' | 'enterprise';
  notes: string;
}

interface DocumentUpload {
  id: string;
  name: string;
  type: string;
  uploaded: boolean;
  required: boolean;
  file?: File;
}

export default function ClientOnboarding() {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [clientData, setClientData] = useState<ClientData>({
    facilityName: '',
    facilityType: 'skilled_nursing',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPhone: '',
    licenseNumber: '',
    medicareNumber: '',
    medicaidNumber: '',
    bedCount: 0,
    staffCount: 0,
    contractStartDate: '',
    contractEndDate: '',
    planType: 'basic',
    notes: ''
  });

  const [documents, setDocuments] = useState<DocumentUpload[]>([
    { id: 'license', name: 'Facility License', type: 'license', uploaded: false, required: true },
    { id: 'insurance', name: 'Liability Insurance Certificate', type: 'insurance', uploaded: false, required: true },
    { id: 'cms_cert', name: 'CMS Certification', type: 'cms', uploaded: false, required: true },
    { id: 'state_cert', name: 'State Health Department Certification', type: 'state', uploaded: false, required: true },
    { id: 'fire_cert', name: 'Fire Department Certification', type: 'fire', uploaded: false, required: false },
    { id: 'policies', name: 'Facility Policies Manual', type: 'policies', uploaded: false, required: true },
    { id: 'org_chart', name: 'Organizational Chart', type: 'org_chart', uploaded: false, required: false },
    { id: 'emergency_plan', name: 'Emergency Preparedness Plan', type: 'emergency', uploaded: false, required: true },
  ]);

  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([
    { id: 'facility_info', title: 'Facility Information', description: 'Basic facility details and contact information', completed: false, required: true },
    { id: 'admin_setup', title: 'Administrator Setup', description: 'Create facility administrator account', completed: false, required: true },
    { id: 'compliance', title: 'Compliance Information', description: 'License numbers and regulatory details', completed: false, required: true },
    { id: 'documents', title: 'Document Upload', description: 'Upload required facility documents', completed: false, required: true },
    { id: 'configuration', title: 'System Configuration', description: 'Configure CareIQ settings for facility', completed: false, required: true },
    { id: 'review', title: 'Review & Complete', description: 'Review all information and complete onboarding', completed: false, required: true }
  ]);

  const updateClientData = (field: keyof ClientData, value: string | number) => {
    setClientData(prev => ({ ...prev, [field]: value }));
  };

  const handleDocumentUpload = (docId: string, file: File) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === docId 
        ? { ...doc, file, uploaded: true }
        : doc
    ));
  };

  const validateStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Facility Info
        return !!(clientData.facilityName && clientData.address && clientData.city && clientData.state && clientData.zipCode && clientData.phone && clientData.email);
      case 1: // Admin Setup
        return !!(clientData.adminFirstName && clientData.adminLastName && clientData.adminEmail);
      case 2: // Compliance
        return !!(clientData.licenseNumber && clientData.bedCount > 0);
      case 3: // Documents
        return documents.filter(doc => doc.required).every(doc => doc.uploaded);
      case 4: // Configuration
        return !!(clientData.contractStartDate && clientData.planType);
      default:
        return true;
    }
  };

  const completeStep = (stepIndex: number) => {
    if (validateStep(stepIndex)) {
      setOnboardingSteps(prev => prev.map((step, idx) => 
        idx === stepIndex ? { ...step, completed: true } : step
      ));
      if (stepIndex < onboardingSteps.length - 1) {
        setActiveStep(stepIndex + 1);
      }
    }
  };

  const createFacilityAndAdmin = async () => {
    try {
      setLoading(true);

      // 1. Create facility record
      const supabase = getBrowserSupabase();
      const { data: facility, error: facilityError } = await supabase
        .from('facilities')
        .insert({
          name: clientData.facilityName,
          facility_type: clientData.facilityType,
          address: clientData.address,
          city: clientData.city,
          state: clientData.state,
          zip_code: clientData.zipCode,
          phone: clientData.phone,
          email: clientData.email,
          license_number: clientData.licenseNumber,
          medicare_number: clientData.medicareNumber,
          medicaid_number: clientData.medicaidNumber,
          bed_count: clientData.bedCount,
          staff_count: clientData.staffCount,
          plan_type: clientData.planType,
          contract_start_date: clientData.contractStartDate,
          contract_end_date: clientData.contractEndDate,
          notes: clientData.notes,
          status: 'onboarding'
        })
        .select()
        .single();

      if (facilityError) throw facilityError;

      // 2. Create admin user via API
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const password = generateTemporaryPassword();
      const userResponse = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: clientData.adminEmail,
          password,
          first_name: clientData.adminFirstName,
          last_name: clientData.adminLastName,
          role: 'DON_Unit_Manager', // Use existing role that works
          facility_id: facility.id,
          phone: clientData.adminPhone
        })
      });

      const userData = await userResponse.json();
      if (!userData.ok) {
        throw new Error(`Failed to create admin user: ${userData.error}`);
      }

      // 4. Upload documents to storage
      for (const doc of documents.filter(d => d.uploaded && d.file)) {
        const fileName = `facilities/${facility.id}/documents/${doc.type}/${doc.file!.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('facility-documents')
          .upload(fileName, doc.file!);

        if (uploadError) {
          console.error(`Failed to upload ${doc.name}:`, uploadError);
        } else {
          // Create document record
          await supabase
            .from('facility_documents')
            .insert({
              facility_id: facility.id,
              document_type: doc.type,
              document_name: doc.name,
              file_path: fileName,
              uploaded_by: userData.user.id,
              status: 'active'
            });
        }
      }

      // 5. Create initial facility settings
      await supabase
        .from('facility_settings')
        .insert({
          facility_id: facility.id,
          settings: {
            timezone: 'America/New_York',
            date_format: 'MM/dd/yyyy',
            shift_times: {
              day: '7:00 AM - 3:00 PM',
              evening: '3:00 PM - 11:00 PM',
              night: '11:00 PM - 7:00 AM'
            },
            notifications_enabled: true,
            compliance_alerts: true
          }
        });

      alert(`Facility and administrator created successfully! 
Facility ID: ${facility.id}
Admin email: ${clientData.adminEmail}
Temporary password: ${password}
(Password has been sent to admin email)`);

      // Reset form
      setClientData({
        facilityName: '',
        facilityType: 'skilled_nursing',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        email: '',
        adminFirstName: '',
        adminLastName: '',
        adminEmail: '',
        adminPhone: '',
        licenseNumber: '',
        medicareNumber: '',
        medicaidNumber: '',
        bedCount: 0,
        staffCount: 0,
        contractStartDate: '',
        contractEndDate: '',
        planType: 'basic',
        notes: ''
      });
      setActiveStep(0);
      setOnboardingSteps(prev => prev.map(step => ({ ...step, completed: false })));

    } catch (error: any) {
      console.error('Onboarding error:', error);
      alert(`Error creating facility: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateTemporaryPassword = () => {
    return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + '!';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Client Onboarding Workflow
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete client setup and facility configuration
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            {onboardingSteps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < onboardingSteps.length - 1 ? 'flex-1' : ''}`}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    step.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : activeStep === index
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-600'
                      : 'border-gray-300 dark:border-gray-600 text-gray-500'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                {index < onboardingSteps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    step.completed ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {onboardingSteps[activeStep]?.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {onboardingSteps[activeStep]?.description}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          
          {/* Step 0: Facility Information */}
          {activeStep === 0 && (
            <div className="p-6">
              <div className="flex items-center mb-6">
                <Building className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Facility Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Facility Name *
                  </label>
                  <input
                    type="text"
                    value={clientData.facilityName}
                    onChange={(e) => updateClientData('facilityName', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Sunset Manor Nursing Home"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Facility Type *
                  </label>
                  <select
                    value={clientData.facilityType}
                    onChange={(e) => updateClientData('facilityType', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="skilled_nursing">Skilled Nursing Facility</option>
                    <option value="assisted_living">Assisted Living</option>
                    <option value="memory_care">Memory Care</option>
                    <option value="independent_living">Independent Living</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={clientData.address}
                    onChange={(e) => updateClientData('address', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="123 Healthcare Dr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={clientData.city}
                    onChange={(e) => updateClientData('city', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Springfield"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={clientData.state}
                    onChange={(e) => updateClientData('state', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="IL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    value={clientData.zipCode}
                    onChange={(e) => updateClientData('zipCode', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="62701"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={clientData.phone}
                    onChange={(e) => updateClientData('phone', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Facility Email *
                  </label>
                  <input
                    type="email"
                    value={clientData.email}
                    onChange={(e) => updateClientData('email', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="admin@sunsetmanor.com"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => completeStep(0)}
                  disabled={!validateStep(0)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Administrator Setup
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Administrator Setup */}
          {activeStep === 1 && (
            <div className="p-6">
              <div className="flex items-center mb-6">
                <UserPlus className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Administrator Setup</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={clientData.adminFirstName}
                    onChange={(e) => updateClientData('adminFirstName', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={clientData.adminLastName}
                    onChange={(e) => updateClientData('adminLastName', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Administrator Email *
                  </label>
                  <input
                    type="email"
                    value={clientData.adminEmail}
                    onChange={(e) => updateClientData('adminEmail', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="john.smith@sunsetmanor.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Administrator Phone
                  </label>
                  <input
                    type="tel"
                    value={clientData.adminPhone}
                    onChange={(e) => updateClientData('adminPhone', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="mt-6 bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                <div className="flex items-start">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Account Creation</h4>
                    <p className="text-blue-700 dark:text-blue-200 text-sm mt-1">
                      A CareIQ account will be created for this administrator with facility admin privileges. 
                      A temporary password will be generated and sent to their email address.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setActiveStep(0)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Back to Facility Info
                </button>
                <button
                  onClick={() => completeStep(1)}
                  disabled={!validateStep(1)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Compliance
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Compliance Information */}
          {activeStep === 2 && (
            <div className="p-6">
              <div className="flex items-center mb-6">
                <Shield className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Compliance Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    License Number *
                  </label>
                  <input
                    type="text"
                    value={clientData.licenseNumber}
                    onChange={(e) => updateClientData('licenseNumber', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="LIC123456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Medicare Number
                  </label>
                  <input
                    type="text"
                    value={clientData.medicareNumber}
                    onChange={(e) => updateClientData('medicareNumber', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Medicaid Number
                  </label>
                  <input
                    type="text"
                    value={clientData.medicaidNumber}
                    onChange={(e) => updateClientData('medicaidNumber', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="654321"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bed Count *
                  </label>
                  <input
                    type="number"
                    value={clientData.bedCount}
                    onChange={(e) => updateClientData('bedCount', parseInt(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="120"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Staff Count
                  </label>
                  <input
                    type="number"
                    value={clientData.staffCount}
                    onChange={(e) => updateClientData('staffCount', parseInt(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="45"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setActiveStep(1)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Back to Admin Setup
                </button>
                <button
                  onClick={() => completeStep(2)}
                  disabled={!validateStep(2)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Documents
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Document Upload */}
          {activeStep === 3 && (
            <div className="p-6">
              <div className="flex items-center mb-6">
                <FileText className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Document Upload</h2>
              </div>
              
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full mr-3 ${
                          doc.uploaded ? 'bg-green-500' : doc.required ? 'bg-red-200' : 'bg-gray-200'
                        }`} />
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {doc.name}
                            {doc.required && <span className="text-red-500 ml-1">*</span>}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {doc.uploaded ? 'Uploaded successfully' : 'Not uploaded'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {doc.uploaded ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleDocumentUpload(doc.id, file);
                                }
                              }}
                            />
                            <div className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                              <Upload className="w-4 h-4 mr-2" />
                              Upload
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setActiveStep(2)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Back to Compliance
                </button>
                <button
                  onClick={() => completeStep(3)}
                  disabled={!validateStep(3)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Configuration
                </button>
              </div>
            </div>
          )}

          {/* Step 4: System Configuration */}
          {activeStep === 4 && (
            <div className="p-6">
              <div className="flex items-center mb-6">
                <Settings className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">System Configuration</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contract Start Date *
                  </label>
                  <input
                    type="date"
                    value={clientData.contractStartDate}
                    onChange={(e) => updateClientData('contractStartDate', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contract End Date
                  </label>
                  <input
                    type="date"
                    value={clientData.contractEndDate}
                    onChange={(e) => updateClientData('contractEndDate', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Plan Type *
                  </label>
                  <select
                    value={clientData.planType}
                    onChange={(e) => updateClientData('planType', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="basic">Basic Plan</option>
                    <option value="professional">Professional Plan</option>
                    <option value="enterprise">Enterprise Plan</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={clientData.notes}
                    onChange={(e) => updateClientData('notes', e.target.value)}
                    rows={4}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Any additional notes about this client..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setActiveStep(3)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Back to Documents
                </button>
                <button
                  onClick={() => completeStep(4)}
                  disabled={!validateStep(4)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Review & Complete
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Review & Complete */}
          {activeStep === 5 && (
            <div className="p-6">
              <div className="flex items-center mb-6">
                <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Review & Complete</h2>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Facility Information</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p><strong>Name:</strong> {clientData.facilityName}</p>
                    <p><strong>Type:</strong> {clientData.facilityType.replace('_', ' ')}</p>
                    <p><strong>Address:</strong> {clientData.address}, {clientData.city}, {clientData.state} {clientData.zipCode}</p>
                    <p><strong>Phone:</strong> {clientData.phone}</p>
                    <p><strong>Email:</strong> {clientData.email}</p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Administrator</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p><strong>Name:</strong> {clientData.adminFirstName} {clientData.adminLastName}</p>
                    <p><strong>Email:</strong> {clientData.adminEmail}</p>
                    <p><strong>Phone:</strong> {clientData.adminPhone}</p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Documents</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>{documents.filter(d => d.uploaded).length} of {documents.length} documents uploaded</p>
                    <p>All required documents: {documents.filter(d => d.required).every(d => d.uploaded) ? 'Complete' : 'Incomplete'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-900 dark:text-yellow-100">Ready to Complete Onboarding</h4>
                    <p className="text-yellow-700 dark:text-yellow-200 text-sm mt-1">
                      This will create the facility record, administrator account, upload documents, and configure the system. 
                      The administrator will receive login credentials via email.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setActiveStep(4)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Back to Configuration
                </button>
                <button
                  onClick={createFacilityAndAdmin}
                  disabled={loading || !onboardingSteps.slice(0, 5).every(step => step.completed)}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Complete Onboarding
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}