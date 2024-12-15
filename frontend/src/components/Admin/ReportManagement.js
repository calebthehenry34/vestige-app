// components/Admin/ReportManagement.js
import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';

const ReportManagement = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch(API_URL + '/api/posts/reports', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (reportId, action) => {
    try {
      await fetch(`API_URL + /api/posts/reports/${reportId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      fetchReports();
    } catch (error) {
      console.error('Error handling report:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Reported Posts</h2>
      {reports.map(report => (
        <div key={report._id} className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <span className="text-gray-500">Reported by:</span>
            <span className="font-medium ml-2">{report.reporter.username}</span>
          </div>
          <div className="mb-4">
            <span className="text-gray-500">Reason:</span>
            <p className="mt-1">{report.reason}</p>
          </div>
          <div className="mb-4">
            <img 
              src={report.post.media} 
              alt="Reported content" 
              className="max-h-64 object-cover rounded"
            />
            <p className="mt-2">{report.post.caption}</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => handleReport(report._id, 'approve')}
              className="px-4 py-2 bg-green-500 text-white rounded-lg"
            >
              Approve
            </button>
            <button
              onClick={() => handleReport(report._id, 'remove')}
              className="px-4 py-2 bg-red-500 text-white rounded-lg"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReportManagement;