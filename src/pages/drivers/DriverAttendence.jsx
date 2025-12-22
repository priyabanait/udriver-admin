import { useEffect, useMemo, useState } from 'react';
import { Search, Download, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../../components/ui/Badge';

function computeDuration(start, end) {
  if (!start) return '';
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const diff = Math.max(0, e - s);
  const mins = Math.floor(diff / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function DriverAttendence() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [driversFallback, setDriversFallback] = useState([]);

  const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';

  useEffect(() => {
    let mounted = true;
    async function fetchAttendance() {
      setLoading(true);
      const endpoints = [
        `${API_BASE}/api/attendance/drivers`,
        `${API_BASE}/api/drivers/attendance`,
        `${API_BASE}/api/attendance`,
      ];

      // Try to find a working attendance endpoint. If none, fallback to drivers list.
      try {
        for (const ep of endpoints) {
          try {
            const res = await fetch(ep);
            if (!res.ok) throw new Error('no');
            const json = await res.json();
            const data = json.data || json;
            if (mounted && Array.isArray(data)) {
              setAttendance(data);
              setLoading(false);
              return;
            }
          } catch (err) {
            // try next endpoint
          }
        }

        // Fallback: fetch drivers and show lastActive as a helpful proxy (Punch In = lastActive, Punch Out = empty)
        const drvRes = await fetch(`${API_BASE}/api/drivers?limit=1000`);
        if (!drvRes.ok) throw new Error('Failed to fetch drivers fallback');
        const drvJson = await drvRes.json();
        const drvData = drvJson.data || drvJson;
        if (mounted) {
          setDriversFallback(drvData.map(d => ({
            id: d.id || d._id,
            name: d.name || d.username || 'Unknown',
            mobile: d.mobile || d.phone || '',
            date: d.lastActive ? new Date(d.lastActive).toISOString().split('T')[0] : null,
            punchIn: d.lastActive || null,
            punchOut: null,
            status: d.status || 'unknown'
          })));
        }
      } catch (err) {
        console.error(err);
        toast.error('Unable to load attendance or drivers data');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchAttendance();
    return () => { mounted = false; };
  }, []);

  const data = useMemo(() => {
    const source = attendance.length ? attendance : driversFallback;
    if (!search) return source;
    return source.filter(r => (r.name || '').toLowerCase().includes(search.toLowerCase()) || (r.mobile || '').includes(search));
  }, [attendance, driversFallback, search]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/attendance/drivers`);
      if (!res.ok) throw new Error('No attendance endpoint');
      const json = await res.json();
      const d = json.data || json;
      setAttendance(Array.isArray(d) ? d : []);
      toast.success('Attendance reloaded');
    } catch (err) {
      toast.error('No attendance endpoint; showing fallback');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const headers = ['Driver ID','Name','Mobile','Date','Punch In','Punch Out','Duration','Status'];
      const rows = data.map(r => [r.id||'', r.name||'', r.mobile||'', r.date||'', r.punchIn?formatDate(r.punchIn):'', r.punchOut?formatDate(r.punchOut):'', computeDuration(r.punchIn, r.punchOut), r.status||'']);
      const csv = [headers.join(','), ...rows.map(row => row.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `drivers_attendance_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Exported attendance CSV');
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold">Driver Attendence</h2>
          <Badge variant={attendance.length ? 'success' : 'secondary'}>{attendance.length ? `${attendance.length} records` : '-'}</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or mobile"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64 pl-9 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button className="btn" onClick={handleRefresh} title="Reload"><RefreshCw /></button>
          <button className="btn" onClick={handleExport} title="Export to CSV"><Download /></button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Punch In</TableHead>
                <TableHead>Punch Out</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id || row._id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.mobile}</TableCell>
                  <TableCell>{row.date || (row.punchIn ? new Date(row.punchIn).toLocaleDateString() : '')}</TableCell>
                  <TableCell>{row.punchIn ? formatDate(row.punchIn) : '—'}</TableCell>
                  <TableCell>{row.punchOut ? formatDate(row.punchOut) : '—'}</TableCell>
                  <TableCell>{computeDuration(row.punchIn, row.punchOut)}</TableCell>
                  <TableCell><Badge variant={row.status === 'active' ? 'success' : 'secondary'}>{row.status || 'unknown'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && <div className="mt-3 text-sm text-muted">Loading…</div>}
          {!loading && data.length === 0 && <div className="mt-3 text-sm text-muted">No attendance records found.</div>}
        </CardContent>
      </Card>
    </div>
  );
}