import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Modal from '../components/Modal';

export default function SampleCollection() {
  const { projectId, addressId } = useParams();
  const [address, setAddress] = useState(null);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSampleDesc, setNewSampleDesc] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);
  const [detailsModalSample, setDetailsModalSample] = useState(null);
  const [newSampleBarcode, setNewSampleBarcode] = useState('');
  const [barcodeScanned, setBarcodeScanned] = useState(false);
  const [notification, setNotification] = useState(null);
  const [timers, setTimers] = useState({});

  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetchAddressAndSamples();
  }, [addressId]);

  const fetchAddressAndSamples = async () => {
    setLoading(true);
    setError(null);
    try {
      const addrRes = await api.get(`/api/v1/projects/${projectId}/addresses/${addressId}`);
      setAddress(addrRes.data);
      const samplesRes = await api.get(`/api/v1/samples/address/${addressId}?date=${today}`);
      setSamples(samplesRes.data);
    } catch (err) {
      setError('Failed to load address or samples');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSample = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);
    try {
      await api.post('/api/v1/samples/', {
        address_id: parseInt(addressId, 10),
        description: newSampleDesc,
        cassette_barcode: newSampleBarcode,
      });
      setNewSampleDesc('');
      setNewSampleBarcode('');
      setBarcodeScanned(false);
      setIsAddModalOpen(false);
      fetchAddressAndSamples();
    } catch (err) {
      setAddError('Failed to add sample');
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenDetailsModal = (sample) => setDetailsModalSample(sample);
  const handleCloseDetailsModal = () => setDetailsModalSample(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Helper: format time in PST 12-hour
  const formatPSTTime = (date) => {
    if (!date) return '--:--';
    return new Date(date).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hour12: true });
  };
  const formatTimer = (t) => {
    const h = Math.floor(t / 3600).toString().padStart(2, '0');
    const m = Math.floor((t % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // Timer effect for all running samples
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const updated = { ...prev };
        for (const id in updated) {
          if (updated[id].running && updated[id].start && !updated[id].stop) {
            updated[id].elapsed = Math.floor((Date.now() - new Date(updated[id].start)) / 1000);
          }
        }
        return { ...updated };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync timers with samples on fetch
  useEffect(() => {
    const newTimers = {};
    samples.forEach(sample => {
      if (sample.start_time) {
        const running = sample.start_time && !sample.stop_time;
        let elapsed = 0;
        if (sample.start_time && sample.stop_time) {
          elapsed = Math.floor((new Date(sample.stop_time) - new Date(sample.start_time)) / 1000);
        } else if (sample.start_time && !sample.stop_time) {
          elapsed = Math.floor((Date.now() - new Date(sample.start_time)) / 1000);
        }
        newTimers[sample.id] = {
          running,
          start: sample.start_time,
          stop: sample.stop_time || null,
          elapsed,
        };
      }
    });
    setTimers(newTimers);
  }, [samples]);

  // Handler to update timer state from modal
  const handleTimerUpdate = (sampleId, timerState) => {
    setTimers(prev => ({ ...prev, [sampleId]: timerState }));
  };

  // Optimistic update handler
  const updateSampleOptimistically = (sampleId, updates) => {
    setSamples(prevSamples => prevSamples.map(s => s.id === sampleId ? { ...s, ...updates } : s));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to Project
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Sample Collection
        </h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Add Sample
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
          <div className="text-lg font-semibold text-gray-800 dark:text-white">{address?.name}</div>
          <div className="text-gray-500 dark:text-gray-400">{address ? new Date(address.date).toLocaleDateString() : ''}</div>
        </div>
        <div className="overflow-x-auto rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-900 dark:text-white">description</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-900 dark:text-white">start</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-900 dark:text-white">end</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-900 dark:text-white">Total Time</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-900 dark:text-white">details</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {samples.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-gray-500">No samples for today.</td>
                </tr>
              ) : (
                samples.map(sample => {
                  let totalSeconds = 0;
                  if (sample.start_time && sample.stop_time) {
                    totalSeconds = Math.floor((new Date(sample.stop_time) - new Date(sample.start_time)) / 1000);
                  } else if (sample.start_time && !sample.stop_time) {
                    totalSeconds = Math.floor((Date.now() - new Date(sample.start_time)) / 1000);
                  }
                  return (
                    <tr key={sample.id}>
                      <td className="px-4 py-2 text-gray-900 dark:text-white">{sample.description}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-white">{formatPSTTime(sample.start_time)}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-white">{formatPSTTime(sample.stop_time)}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-white">
                        <span className={sample.start_time && !sample.stop_time ? "font-mono text-green-600 dark:text-green-400" : "font-mono"}>
                          {formatTimer(totalSeconds)}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <button
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          onClick={() => handleOpenDetailsModal(sample)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setBarcodeScanned(false); }}>
        <form onSubmit={handleAddSample} className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Sample</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <input
              type="text"
              value={newSampleDesc}
              onChange={e => setNewSampleDesc(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
              placeholder="Enter sample description"
              required
              disabled={!barcodeScanned}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cassette Barcode</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newSampleBarcode}
                readOnly
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-4 py-2"
                placeholder="Scan barcode to fill"
                required
              />
              <button
                type="button"
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={() => {
                  // Simulate barcode scan
                  setNewSampleBarcode('BC-' + Math.random().toString(36).substr(2, 8).toUpperCase());
                  setBarcodeScanned(true);
                }}
                disabled={barcodeScanned}
              >
                {barcodeScanned ? 'Scanned' : 'Scan Barcode'}
              </button>
            </div>
          </div>
          {addError && <div className="text-red-500">{addError}</div>}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => { setIsAddModalOpen(false); setBarcodeScanned(false); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={addLoading || !barcodeScanned}
            >
              Add Sample
            </button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={!!detailsModalSample} onClose={() => setDetailsModalSample(null)}>
        {detailsModalSample && (
          <DetailsModalContent
            sample={detailsModalSample}
            onClose={() => setDetailsModalSample(null)}
            onUpdate={fetchAddressAndSamples}
            showNotification={showNotification}
            timerState={timers[detailsModalSample.id]}
            onTimerUpdate={state => handleTimerUpdate(detailsModalSample.id, state)}
            formatPSTTime={formatPSTTime}
            formatTimer={formatTimer}
            updateSampleOptimistically={updateSampleOptimistically}
          />
        )}
      </Modal>
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{notification.msg}</div>
      )}
    </div>
  );
}

function DetailsModalContent({ sample, onClose, onUpdate, showNotification, timerState, onTimerUpdate, formatPSTTime, formatTimer, updateSampleOptimistically }) {
  const [scanned, setScanned] = React.useState(!!sample.cassette_barcode);
  const [form, setForm] = React.useState({
    description: sample.description || '',
    is_inside: sample.is_inside ?? null,
    flow_rate: sample.flow_rate ?? '',
    volume_required: sample.volume_required ?? '',
    fields: sample.fields ?? '',
    fibers: sample.fibers ?? '',
    cassette_barcode: sample.cassette_barcode || '',
    start_time: sample.start_time ? new Date(sample.start_time) : null,
    stop_time: sample.stop_time ? new Date(sample.stop_time) : null,
  });
  const [timer, setTimer] = React.useState(() => {
    if (sample.start_time && sample.stop_time) {
      return (new Date(sample.stop_time) - new Date(sample.start_time)) / 1000;
    } else if (sample.start_time && !sample.stop_time) {
      return (Date.now() - new Date(sample.start_time)) / 1000;
    }
    return 0;
  });
  const [timerRunning, setTimerRunning] = React.useState(!!(sample.start_time && !sample.stop_time));
  const [timerInterval, setTimerInterval] = React.useState(null);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const initialForm = useRef(form);
  const [submitting, setSubmitting] = React.useState(false);

  // Timer effect
  useEffect(() => {
    if (timerRunning) {
      const interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    } else if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  }, [timerRunning]);

  // Timer control handlers with immediate backend PATCH and optimistic UI
  const handleStart = async () => {
    if (!form.start_time) {
      const now = new Date();
      setForm(f => ({ ...f, start_time: now, stop_time: null }));
      setTimer(0);
      setTimerRunning(true);
      // PATCH start_time immediately
      try {
        await api.patch(`/api/v1/samples/${sample.id}`, {
          start_time: now.toISOString(),
          stop_time: null,
        });
        onTimerUpdate(sample.id, { running: true, start: now, stop: null, elapsed: 0 });
        updateSampleOptimistically(sample.id, { start_time: now.toISOString(), stop_time: null });
      } catch (err) {
        showNotification('Failed to start timer', 'error');
      }
    } else {
      setTimerRunning(true);
    }
  };

  const handleStop = async () => {
    if (form.start_time) {
      const now = new Date();
      setForm(f => ({ ...f, stop_time: now }));
      setTimerRunning(false);
      // PATCH stop_time immediately
      try {
        await api.patch(`/api/v1/samples/${sample.id}`, {
          stop_time: now.toISOString(),
        });
        onTimerUpdate(sample.id, { running: false, start: form.start_time, stop: now, elapsed: Math.floor((now - new Date(form.start_time)) / 1000) });
        updateSampleOptimistically(sample.id, { stop_time: now.toISOString() });
      } catch (err) {
        showNotification('Failed to stop timer', 'error');
      }
    }
  };

  const handleResume = async () => {
    if (form.start_time && form.stop_time) {
      setForm(f => ({ ...f, stop_time: null }));
      setTimerRunning(true);
      // PATCH only stop_time immediately
      try {
        await api.patch(`/api/v1/samples/${sample.id}`, {
          stop_time: null,
        });
        onTimerUpdate(sample.id, { running: true, start: form.start_time, stop: null, elapsed: Math.floor((Date.now() - new Date(form.start_time)) / 1000) });
        updateSampleOptimistically(sample.id, { stop_time: null });
      } catch (err) {
        showNotification('Failed to resume timer', 'error');
      }
    }
  };

  const confirmReset = async () => {
    setForm(f => ({ ...f, start_time: null, stop_time: null }));
    setTimer(0);
    setTimerRunning(false);
    setShowResetConfirm(false);
    // PATCH reset times immediately
    try {
      await api.patch(`/api/v1/samples/${sample.id}`, {
        start_time: null,
        stop_time: null,
      });
      onTimerUpdate(sample.id, { running: false, start: null, stop: null, elapsed: 0 });
      updateSampleOptimistically(sample.id, { start_time: null, stop_time: null });
    } catch (err) {
      showNotification('Failed to reset timer', 'error');
    }
  };

  const handleScan = () => {
    if (!form.cassette_barcode) {
      const code = 'BC-' + Math.random().toString(36).substr(2, 8).toUpperCase();
      setForm(f => ({ ...f, cassette_barcode: code }));
      setScanned(true);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const isChanged = () => {
    const a = initialForm.current;
    const b = form;
    return (
      a.description !== b.description ||
      a.is_inside !== b.is_inside ||
      a.flow_rate !== b.flow_rate ||
      a.volume_required !== b.volume_required ||
      a.fields !== b.fields ||
      a.fibers !== b.fibers ||
      a.cassette_barcode !== b.cassette_barcode
    );
  };

  const handleClose = async () => {
    if (isChanged() && form.cassette_barcode) {
      setSubmitting(true);
      try {
        await api.patch(`/api/v1/samples/${sample.id}`, {
          description: form.description,
          is_inside: form.is_inside,
          flow_rate: form.flow_rate === '' ? null : Number(form.flow_rate),
          volume_required: form.volume_required === '' ? null : Number(form.volume_required),
          fields: form.fields === '' ? null : Number(form.fields),
          fibers: form.fibers === '' ? null : Number(form.fibers),
          cassette_barcode: form.cassette_barcode,
        });
        showNotification('Sample updated successfully', 'success');
        onUpdate && onUpdate();
      } catch (err) {
        showNotification('Failed to update sample', 'error');
      } finally {
        setSubmitting(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-white">
      <h2 className="text-2xl font-bold mb-2">Sample Details</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Cassette Barcode</label>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={form.cassette_barcode}
            readOnly
            className="w-full rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white"
            placeholder="Scan barcode to fill"
          />
          {!form.cassette_barcode && (
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              onClick={handleScan}
              disabled={!!form.cassette_barcode}
            >
              Scan Barcode
            </button>
          )}
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Timer</label>
        <div className="flex items-center space-x-4">
          <div className="text-2xl font-mono">{formatTimer(timer)}</div>
          {!form.start_time && (
            <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={handleStart} disabled={!scanned}>Start</button>
          )}
          {form.start_time && !form.stop_time && timerRunning && (
            <button className="px-3 py-1 bg-yellow-600 text-white rounded" onClick={handleStop}>Stop</button>
          )}
          {form.start_time && form.stop_time && (
            <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleResume}>Resume</button>
          )}
          {(form.start_time || timer > 0) && (
            <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => setShowResetConfirm(true)}>Reset</button>
          )}
        </div>
        <div className="flex space-x-6 mt-2">
          <div>Start: <span className="font-mono">{form.start_time ? new Date(form.start_time).toLocaleTimeString() : '--:--'}</span></div>
          <div>End: <span className="font-mono">{form.stop_time ? new Date(form.stop_time).toLocaleTimeString() : '--:--'}</span></div>
        </div>
      </div>
      {showResetConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg">
            <div className="mb-4 text-lg">Are you sure you want to reset the timer? This cannot be undone.</div>
            <div className="flex justify-end space-x-3">
              <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowResetConfirm(false)}>Cancel</button>
              <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={confirmReset}>Reset</button>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <input
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            disabled={!scanned}
            className="w-full rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">In/Out</label>
          <select
            name="is_inside"
            value={form.is_inside === null ? '' : form.is_inside ? 'inside' : 'outside'}
            onChange={e => setForm(f => ({ ...f, is_inside: e.target.value === 'inside' }))}
            disabled={!scanned}
            className="w-full rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white"
          >
            <option value="">-- Select --</option>
            <option value="inside">Inside</option>
            <option value="outside">Outside</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Flow Rate (L/M)</label>
          <input
            type="number"
            name="flow_rate"
            value={form.flow_rate}
            onChange={handleChange}
            disabled={!scanned}
            className="w-full rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Volume Required (Liters)</label>
          <input
            type="number"
            name="volume_required"
            value={form.volume_required}
            onChange={handleChange}
            disabled={!scanned}
            className="w-full rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Fields</label>
          <input
            type="number"
            name="fields"
            value={form.fields}
            onChange={handleChange}
            disabled={!scanned}
            className="w-full rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Fibers</label>
          <input
            type="number"
            name="fibers"
            value={form.fibers}
            onChange={handleChange}
            disabled={!scanned}
            className="w-full rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white"
          />
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={submitting}
        >
          Close
        </button>
      </div>
    </div>
  );
} 