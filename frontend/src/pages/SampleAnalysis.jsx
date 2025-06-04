import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/Modal';

export default function SampleAnalysis() {
  const [barcode, setBarcode] = useState('');
  const [sample, setSample] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testBarcodes, setTestBarcodes] = useState([]);
  const [fields, setFields] = useState('');
  const [fibers, setFibers] = useState('');
  const [saving, setSaving] = useState(false);
  const { projectId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTestBarcodes();
  }, []);

  useEffect(() => {
    if (sample) {
      setFields(sample.fields?.toString() || '');
      setFibers(sample.fibers?.toString() || '');
    }
  }, [sample]);

  const fetchTestBarcodes = async () => {
    try {
      const response = await api.get('/api/v1/samples');
      const barcodes = [...new Set(response.data.map(sample => sample.cassette_barcode))];
      setTestBarcodes(barcodes);
    } catch (err) {
      console.error('Error fetching test barcodes:', err);
    }
  };

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcode) return;

    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/v1/samples');
      const foundSample = response.data.find(s => s.cassette_barcode === barcode);
      
      if (foundSample) {
        const detailResponse = await api.get(`/api/v1/samples/${foundSample.id}`);
        setSample(detailResponse.data);
      } else {
        setError('Sample not found. Please scan a valid barcode.');
      }
    } catch (err) {
      setError('Failed to fetch sample information');
      console.error('Error fetching sample:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestBarcodeClick = (testBarcode) => {
    setBarcode(testBarcode);
  };

  const handleSaveAnalysis = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await api.patch(`/api/v1/samples/${sample.id}`, {
        fields: parseInt(fields) || null,
        fibers: parseInt(fibers) || null
      });
      setSample(response.data);
    } catch (err) {
      setError('Failed to save analysis data');
      console.error('Error saving analysis:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not started';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Helper to parse Postgres interval string to seconds
  const parseIntervalToSeconds = (interval) => {
    if (!interval) return 0;
    // Handles 'HH:MM:SS' or 'D days HH:MM:SS'
    const match = interval.match(/(?:(\d+) days? )?(\d+):(\d+):(\d+)/);
    if (!match) return 0;
    const days = parseInt(match[1] || '0', 10);
    const hours = parseInt(match[2] || '0', 10);
    const minutes = parseInt(match[3] || '0', 10);
    const seconds = parseInt(match[4] || '0', 10);
    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
  };

  const formatDuration = (interval) => {
    const totalSeconds = parseIntervalToSeconds(interval);
    if (!totalSeconds) return 'N/A';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to Project
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Sample Analysis
        </h1>
        
        <form onSubmit={handleBarcodeSubmit} className="space-y-4">
          <div>
            <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Scan Cassette Barcode
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                id="barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
                placeholder="Enter or scan barcode"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Submit'}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Test Barcodes
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {testBarcodes.map((testBarcode) => (
              <button
                key={testBarcode}
                onClick={() => handleTestBarcodeClick(testBarcode)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {testBarcode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {sample && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Sample Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Project:</p>
              <p className="font-medium text-gray-900 dark:text-white">{sample.project_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Address:</p>
              <p className="font-medium text-gray-900 dark:text-white">{sample.address_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Address Date:</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {sample.address_date ? new Date(sample.address_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Description:</p>
              <p className="font-medium text-gray-900 dark:text-white">{sample.description}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Barcode:</p>
              <p className="font-medium text-gray-900 dark:text-white">{sample.cassette_barcode}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Location:</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {sample.is_inside === true ? 'Inside' : sample.is_inside === false ? 'Outside' : 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Flow Rate:</p>
              <p className="font-medium text-gray-900 dark:text-white">{sample.flow_rate} L/min</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Volume Required:</p>
              <p className="font-medium text-gray-900 dark:text-white">{sample.volume_required} L</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Start Time:</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(sample.start_time)}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Stop Time:</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(sample.stop_time)}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Total Time:</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatDuration(sample.total_time_ran)}
              </p>
            </div>
            <div>
              <label htmlFor="fields" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fields:
              </label>
              <input
                type="number"
                id="fields"
                value={fields}
                onChange={(e) => setFields(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
                placeholder="Enter number of fields"
              />
            </div>
            <div>
              <label htmlFor="fibers" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fibers:
              </label>
              <input
                type="number"
                id="fibers"
                value={fibers}
                onChange={(e) => setFibers(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
                placeholder="Enter number of fibers"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveAnalysis}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Analysis'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 