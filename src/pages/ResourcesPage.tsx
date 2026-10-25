import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Resource, ResourceType, ResourceStatus } from '../types';
import {
  Ambulance,
  Flame,
  Shield,
  LifeBuoy,
  Wrench,
  Plus,
  RefreshCw,
  MapPin,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ResourcesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New Resource Modal (Admin)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ResourceType>('AMBULANCE');
  const [newLat, setNewLat] = useState('37.7785');
  const [newLng, setNewLng] = useState('-122.4115');
  const [newAddress, setNewAddress] = useState('Central Emergency Station');
  const [newCapacity, setNewCapacity] = useState('2 Crew Members');
  const [newNotes, setNewNotes] = useState('Operational unit ready for dispatch');

  const loadResources = async () => {
    setIsLoading(true);
    try {
      const data = await api.getResources({
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      });
      setResources(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, [typeFilter, statusFilter]);

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createResource({
        name: newName.trim(),
        type: newType,
        latitude: parseFloat(newLat),
        longitude: parseFloat(newLng),
        address: newAddress.trim(),
        capacity: newCapacity.trim(),
        operationalNotes: newNotes.trim()
      });
      setShowAddModal(false);
      setNewName('');
      loadResources();
    } catch (err: any) {
      alert(err.message || 'Failed to create resource');
    }
  };

  const handleUpdateStatus = async (resId: string, newStatus: ResourceStatus) => {
    try {
      await api.updateResource(resId, { status: newStatus });
      loadResources();
    } catch (err: any) {
      alert(err.message || 'Failed to update resource status');
    }
  };

  const getTypeIcon = (type: ResourceType) => {
    switch (type) {
      case 'AMBULANCE':
        return <Ambulance className="w-4 h-4 text-rose-600" />;
      case 'FIRE_UNIT':
        return <Flame className="w-4 h-4 text-amber-600" />;
      case 'POLICE_PATROL':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'RESCUE_TEAM':
        return <LifeBuoy className="w-4 h-4 text-emerald-600" />;
      default:
        return <Wrench className="w-4 h-4 text-purple-600" />;
    }
  };

  const getStatusBadge = (status: ResourceStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Available
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Assigned
          </span>
        );
      case 'EN_ROUTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            En Route
          </span>
        );
      case 'ON_SCENE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            On Scene
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Unavailable
          </span>
        );
    }
  };

  const availableCount = resources.filter((r) => r.status === 'AVAILABLE').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fleet & Resources</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {availableCount} Available
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Monitor response unit readiness, staging bases, deployment status, and crew capacity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasRole(['admin']) && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Resource</span>
            </button>
          )}
          <button
            type="button"
            onClick={loadResources}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Fleet"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 font-medium">Type:</span>
          {['ALL', 'AMBULANCE', 'FIRE_UNIT', 'POLICE_PATROL', 'RESCUE_TEAM'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                typeFilter === t
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="EN_ROUTE">En Route</option>
            <option value="ON_SCENE">On Scene</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>
        </div>
      </div>

      {/* Units Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-sm text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          Loading resources...
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-sm text-slate-500">
          No fleet resources match the current filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((res) => (
            <div
              key={res.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-100">
                      {getTypeIcon(res.type)}
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-900">{res.id}</span>
                  </div>
                  <div>{getStatusBadge(res.status)}</div>
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{res.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{res.address}</span>
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Capacity:</span>
                    <span className="font-medium text-slate-700">{res.capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Notes:</span>
                    <span className="font-medium text-slate-700 truncate max-w-[180px]">{res.operationalNotes}</span>
                  </div>
                  {res.assignedIncidentId && (
                    <div className="flex justify-between text-blue-600 font-semibold pt-1">
                      <span>Assigned To:</span>
                      <Link to={`/incidents/${res.assignedIncidentId}`} className="hover:underline">
                        {res.assignedIncidentId}
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Selector for Quick Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 font-medium">Update:</span>
                <select
                  value={res.status}
                  onChange={(e) => handleUpdateStatus(res.id, e.target.value as ResourceStatus)}
                  className="px-2 py-1 border border-slate-300 rounded-md bg-white text-slate-700 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="AVAILABLE">Set Available</option>
                  <option value="ASSIGNED">Set Assigned</option>
                  <option value="EN_ROUTE">Set En Route</option>
                  <option value="ON_SCENE">Set On Scene</option>
                  <option value="UNAVAILABLE">Set Unavailable</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Provision Unit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Provision New Response Unit</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unit Call Sign / Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Squad 4 Ambulance"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as ResourceType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="AMBULANCE">Ambulance</option>
                  <option value="FIRE_UNIT">Fire Unit</option>
                  <option value="POLICE_PATROL">Police Patrol</option>
                  <option value="RESCUE_TEAM">Rescue Team</option>
                  <option value="UTILITY_UNIT">Utility Unit</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="text"
                    required
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="text"
                    required
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Base / Staging Address</label>
                <input
                  type="text"
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Crew Capacity</label>
                <input
                  type="text"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operational Notes</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  Save Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
