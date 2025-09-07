"use client";

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Building, 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Plus,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  license_number: string;
  cms_certification_number: string;
  bed_count: number;
  facility_type: string;
}

interface StaffRole {
  id: string;
  name: string;
  description: string;
  permissions: any;
}

interface UserData {
  // Personal Information
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  
  // Facility Information
  facilityId: string;
  facilityName: string;
  facilityAddress: string;
  facilityCity: string;
  facilityState: string;
  facilityZip: string;
  facilityPhone: string;
  facilityEmail: string;
  licenseNumber: string;
  cmsCertificationNumber: string;
  bedCount: number;
  facilityType: string;
  
  // Role and Permissions
  roleId: string;
  isPrimaryContact: boolean;
  
  // Additional Staff (if creating multiple users)
  additionalStaff: Array<{
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    roleId: string;
  }>;
}

interface UserOnboardingWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (users: any[]) => void;
}

const STEPS = [
  { id: 'personal', title: 'Personal Information', icon: User },
  { id: 'facility', title: 'Facility Details', icon: Building },
  { id: 'role', title: 'Role & Permissions', icon: Users },
  { id: 'staff', title: 'Additional Staff', icon: Plus },
  { id: 'review', title: 'Review & Create', icon: CheckCircle }
];

export default function UserOnboardingWorkflow({ isOpen, onClose, onComplete }: UserOnboardingWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [userData, setUserData] = useState<UserData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    facilityId: '',
    facilityName: '',
    facilityAddress: '',
    facilityCity: '',
    facilityState: '',
    facilityZip: '',
    facilityPhone: '',
    facilityEmail: '',
    licenseNumber: '',
    cmsCertificationNumber: '',
    bedCount: 0,
    facilityType: 'skilled_nursing',
    roleId: '',
    isPrimaryContact: true,
    additionalStaff: []
  });

  useEffect(() => {
    if (isOpen) {
      loadFacilities();
      loadRoles();
    }
  }, [isOpen]);

  const loadFacilities = async () => {
    try {
      const response = await fetch('/api/admin/facilities');
      if (response.ok) {
        const data = await response.json();
        setFacilities(data.facilities || []);
      }
    } catch (error) {
      console.error('Failed to load facilities:', error);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Personal Information
        if (!userData.email) newErrors.email = 'Email is required';
        if (!userData.password) newErrors.password = 'Password is required';
        if (userData.password !== userData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        if (!userData.firstName) newErrors.firstName = 'First name is required';
        if (!userData.lastName) newErrors.lastName = 'Last name is required';
        break;

      case 1: // Facility Details
        if (!userData.facilityName) newErrors.facilityName = 'Facility name is required';
        if (!userData.facilityAddress) newErrors.facilityAddress = 'Address is required';
        if (!userData.facilityCity) newErrors.facilityCity = 'City is required';
        if (!userData.facilityState) newErrors.facilityState = 'State is required';
        if (!userData.facilityZip) newErrors.facilityZip = 'ZIP code is required';
        break;

      case 2: // Role & Permissions
        if (!userData.roleId) newErrors.roleId = 'Please select a role';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleInputChange = (field: keyof UserData, value: any) => {
    setUserData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFacilitySelect = (facilityId: string) => {
    const facility = facilities.find(f => f.id === facilityId);
    if (facility) {
      setUserData(prev => ({
        ...prev,
        facilityId: facility.id,
        facilityName: facility.name,
        facilityAddress: facility.address || '',
        facilityCity: facility.city || '',
        facilityState: facility.state,
        facilityZip: facility.zip_code || '',
        facilityPhone: facility.phone || '',
        facilityEmail: facility.email || '',
        licenseNumber: facility.license_number || '',
        cmsCertificationNumber: facility.cms_certification_number || '',
        bedCount: facility.bed_count || 0,
        facilityType: facility.facility_type
      }));
    }
  };

  const addStaffMember = () => {
    setUserData(prev => ({
      ...prev,
      additionalStaff: [...prev.additionalStaff, {
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        roleId: ''
      }]
    }));
  };

  const removeStaffMember = (index: number) => {
    setUserData(prev => ({
      ...prev,
      additionalStaff: prev.additionalStaff.filter((_, i) => i !== index)
    }));
  };

  const updateStaffMember = (index: number, field: string, value: string) => {
    setUserData(prev => ({
      ...prev,
      additionalStaff: prev.additionalStaff.map((staff, i) => 
        i === index ? { ...staff, [field]: value } : staff
      )
    }));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/create-user-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        const result = await response.json();
        onComplete(result.users);
        onClose();
      } else {
        const error = await response.json();
        setErrors({ submit: error.message || 'Failed to create users' });
      }
    } catch (error) {
      setErrors({ submit: 'Failed to create users' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Add New User & Facility
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isActive 
                      ? 'border-blue-600 bg-blue-600 text-white' 
                      : isCompleted 
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : isCompleted 
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.title}
                  </span>
                  {index < STEPS.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-gray-400 mx-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {currentStep === 0 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={userData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                    placeholder="user@facility.com"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={userData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={userData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                    placeholder="John"
                  />
                  {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={userData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                    placeholder="Doe"
                  />
                  {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={userData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                      placeholder="Create a secure password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={userData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                    placeholder="Confirm your password"
                  />
                  {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Facility Information
              </h3>

              {/* Existing Facility Selection */}
              {facilities.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Existing Facility (Optional)
                  </label>
                  <select
                    value={userData.facilityId}
                    onChange={(e) => handleFacilitySelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Create New Facility</option>
                    {facilities.map(facility => (
                      <option key={facility.id} value={facility.id}>
                        {facility.name} - {facility.city}, {facility.state}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Facility Name *
                  </label>
                  <input
                    type="text"
                    value={userData.facilityName}
                    onChange={(e) => handleInputChange('facilityName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.facilityName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                    placeholder="Sunset Nursing Home"
                  />
                  {errors.facilityName && <p className="text-red-500 text-sm mt-1">{errors.facilityName}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={userData.facilityAddress}
                    onChange={(e) => handleInputChange('facilityAddress', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.facilityAddress ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                    placeholder="123 Main Street"
                  />
                  {errors.facilityAddress && <p className="text-red-500 text-sm mt-1">{errors.facilityAddress}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={userData.facilityCity}
                    onChange={(e) => handleInputChange('facilityCity', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.facilityCity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                    placeholder="Anytown"
                  />
                  {errors.facilityCity && <p className="text-red-500 text-sm mt-1">{errors.facilityCity}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State *
                  </label>
                  <select
                    value={userData.facilityState}
                    onChange={(e) => handleInputChange('facilityState', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.facilityState ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                  >
                    <option value="">Select State</option>
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
                  </select>
                  {errors.facilityState && <p className="text-red-500 text-sm mt-1">{errors.facilityState}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    value={userData.facilityZip}
                    onChange={(e) => handleInputChange('facilityZip', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.facilityZip ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                    placeholder="12345"
                  />
                  {errors.facilityZip && <p className="text-red-500 text-sm mt-1">{errors.facilityZip}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={userData.facilityPhone}
                    onChange={(e) => handleInputChange('facilityPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={userData.facilityEmail}
                    onChange={(e) => handleInputChange('facilityEmail', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="info@facility.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    License Number
                  </label>
                  <input
                    type="text"
                    value={userData.licenseNumber}
                    onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="State License #"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CMS Certification Number
                  </label>
                  <input
                    type="text"
                    value={userData.cmsCertificationNumber}
                    onChange={(e) => handleInputChange('cmsCertificationNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="CMS Certification #"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bed Count
                  </label>
                  <input
                    type="number"
                    value={userData.bedCount}
                    onChange={(e) => handleInputChange('bedCount', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="120"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Facility Type
                  </label>
                  <select
                    value={userData.facilityType}
                    onChange={(e) => handleInputChange('facilityType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="skilled_nursing">Skilled Nursing</option>
                    <option value="assisted_living">Assisted Living</option>
                    <option value="rehabilitation">Rehabilitation</option>
                    <option value="memory_care">Memory Care</option>
                    <option value="hospice">Hospice</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Role & Permissions
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Role *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {roles.map(role => (
                    <div
                      key={role.id}
                      onClick={() => handleInputChange('roleId', role.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        userData.roleId === role.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {role.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {role.description}
                          </p>
                        </div>
                        {userData.roleId === role.id && (
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {errors.roleId && <p className="text-red-500 text-sm mt-1">{errors.roleId}</p>}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPrimaryContact"
                  checked={userData.isPrimaryContact}
                  onChange={(e) => handleInputChange('isPrimaryContact', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPrimaryContact" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  This user is the primary contact for the facility
                </label>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Additional Staff Members
                </h3>
                <button
                  onClick={addStaffMember}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Staff Member
                </button>
              </div>

              <p className="text-gray-600 dark:text-gray-400">
                Add additional staff members who will have access to this facility. You can skip this step if you only need to create one user.
              </p>

              {userData.additionalStaff.map((staff, index) => (
                <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Staff Member {index + 1}
                    </h4>
                    <button
                      onClick={() => removeStaffMember(index)}
                      className="p-1 text-red-600 hover:text-red-800 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={staff.email}
                        onChange={(e) => updateStaffMember(index, 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="staff@facility.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={staff.phone}
                        onChange={(e) => updateStaffMember(index, 'phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={staff.firstName}
                        onChange={(e) => updateStaffMember(index, 'firstName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Jane"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={staff.lastName}
                        onChange={(e) => updateStaffMember(index, 'lastName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Smith"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Role
                      </label>
                      <select
                        value={staff.roleId}
                        onChange={(e) => updateStaffMember(index, 'roleId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Select Role</option>
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {userData.additionalStaff.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No additional staff members added yet</p>
                  <p className="text-sm">Click "Add Staff Member" to get started</p>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Review & Create
              </h3>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Primary User
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Name:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {userData.firstName} {userData.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">{userData.email}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Phone:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">{userData.phone || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Role:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {roles.find(r => r.id === userData.roleId)?.name || 'Not selected'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Facility Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Name:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">{userData.facilityName}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Type:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100 capitalize">
                      {userData.facilityType.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Address:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {userData.facilityAddress}, {userData.facilityCity}, {userData.facilityState} {userData.facilityZip}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Phone:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {userData.facilityPhone || 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Beds:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">{userData.bedCount}</span>
                  </div>
                </div>
              </div>

              {userData.additionalStaff.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Additional Staff ({userData.additionalStaff.length})
                  </h4>
                  <div className="space-y-2">
                    {userData.additionalStaff.map((staff, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-900 dark:text-gray-100">
                          {staff.firstName} {staff.lastName} ({staff.email})
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {roles.find(r => r.id === staff.roleId)?.name || 'No role selected'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {errors.submit && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-800 dark:text-red-200">{errors.submit}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            
            {currentStep === STEPS.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {loading ? 'Creating Users...' : 'Create Users'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
