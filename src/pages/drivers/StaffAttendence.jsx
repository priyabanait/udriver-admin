import { useEffect, useMemo, useState } from 'react';
import { Search, Download, RefreshCw, Calendar, DollarSign, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { formatDate, formatTime } from '../../utils';
import { Badge } from '../../components/ui/Badge';

function computeDuration(start, end, durationMinutes = null) {
  // If duration in minutes is provided from backend, use it
  if (durationMinutes !== null && durationMinutes !== undefined) {
    const h = Math.floor(durationMinutes / 60);
    const m = durationMinutes % 60;
    return `${h}h ${m}m`;
  }
  
  // Otherwise calculate from start/end times
  if (!start) return '';
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const diff = Math.max(0, e - s);
  const mins = Math.floor(diff / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function formatDateOnly(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export default function StaffAttendence() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [managersFallback, setManagersFallback] = useState([]);
  const [allManagers, setAllManagers] = useState([]);
  const [dateFilter, setDateFilter] = useState('');
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [salaryMonth, setSalaryMonth] = useState(new Date().getMonth() + 1);
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear());
  const [salaryData, setSalaryData] = useState(null);
  const [salaryAmount, setSalaryAmount] = useState(0);
  const [loadingSalary, setLoadingSalary] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      setLoading(true);
      
      try {
        // Fetch all managers first
        const managersRes = await fetch(`${API_BASE}/api/managers?limit=1000`);
        let managersData = [];
        if (managersRes.ok) {
          const managersJson = await managersRes.json();
          managersData = managersJson.data || managersJson || [];
          if (!Array.isArray(managersData)) {
            managersData = [];
          }
        }
        
        if (mounted) {
          setAllManagers(managersData);
        }
        
        // Fetch all historical attendance records from the new endpoint
        const attendanceRes = await fetch(`${API_BASE}/api/managers/attendance`);
        if (!attendanceRes.ok) {
          // Fallback: create attendance records from managers
          if (mounted) {
            const attendanceData = managersData.map(m => {
              const loginDate = m.lastLogin ? new Date(m.lastLogin) : null;
              
              return {
                id: m._id || m.id,
                recordId: `${m._id || m.id}-${m.lastLogin || 'no-login'}`,
                name: m.name || 'Unknown',
                mobile: m.mobile || m.phone || '',
                email: m.email || '',
                date: loginDate ? formatDateOnly(loginDate) : (m.updatedAt ? formatDateOnly(new Date(m.updatedAt)) : '—'),
                punchIn: m.lastLogin || null,
                punchOut: m.lastLogout || null,
                duration: null,
                status: m.status || 'unknown',
                department: m.department || 'Manager'
              };
            });
            
            setAttendance(attendanceData);
            setManagersFallback(attendanceData);
          }
          return;
        }
        
        const attendanceJson = await attendanceRes.json();
        const attendanceData = attendanceJson.data || [];
        
        if (mounted) {
          // Group attendance records by manager ID and date
          // If a manager has multiple login/logout on the same day, combine them
          const attendanceByManagerAndDate = new Map();
          
          attendanceData.forEach(record => {
            const managerId = record.managerId || record.id;
            const recordDate = record.date ? formatDateOnly(record.date) : (record.loginTime ? formatDateOnly(record.loginTime) : null);
            const key = `${managerId}-${recordDate}`;
            
            if (!attendanceByManagerAndDate.has(key)) {
              attendanceByManagerAndDate.set(key, {
                id: managerId,
                recordId: record._id || `${managerId}-${recordDate}`,
                name: record.name || 'Unknown',
                mobile: record.mobile || '',
                email: record.email || '',
                date: recordDate || '—',
                punchIn: record.loginTime ? new Date(record.loginTime) : null,
                punchOut: record.logoutTime ? new Date(record.logoutTime) : null,
                duration: record.duration || 0,
                status: record.status || 'unknown',
                department: record.department || 'Manager',
                allLogins: record.loginTime ? [new Date(record.loginTime)] : [],
                allLogouts: record.logoutTime ? [new Date(record.logoutTime)] : []
              });
            } else {
              const existing = attendanceByManagerAndDate.get(key);
              // Update with earliest login and latest logout
              if (record.loginTime) {
                const loginTime = new Date(record.loginTime);
                if (!existing.punchIn || loginTime < existing.punchIn) {
                  existing.punchIn = loginTime;
                }
                existing.allLogins.push(loginTime);
              }
              if (record.logoutTime) {
                const logoutTime = new Date(record.logoutTime);
                if (!existing.punchOut || logoutTime > existing.punchOut) {
                  existing.punchOut = logoutTime;
                }
                existing.allLogouts.push(logoutTime);
              }
              // Sum up duration
              if (record.duration) {
                existing.duration += record.duration;
              }
            }
          });
          
      // Convert map to array
      const formattedData = Array.from(attendanceByManagerAndDate.values()).map(record => {
        // Remove temporary tracking properties
        const cleanRecord = { ...record };
        delete cleanRecord.allLogins;
        delete cleanRecord.allLogouts;
        
        return {
          ...cleanRecord,
          // Calculate total duration if we have punch in/out
          duration: record.punchIn && record.punchOut 
            ? Math.floor((record.punchOut - record.punchIn) / 60000) // duration in minutes
            : record.duration
        };
      });
          
          // Create a map of managers with their latest attendance
          const managerAttendanceMap = new Map();
          formattedData.forEach(record => {
            const managerId = record.id;
            if (!managerAttendanceMap.has(managerId)) {
              managerAttendanceMap.set(managerId, record);
            } else {
              // Keep the most recent attendance record
              const existing = managerAttendanceMap.get(managerId);
              const recordDate = record.punchIn || record.date;
              const existingDate = existing.punchIn || existing.date;
              if (recordDate && existingDate && new Date(recordDate) > new Date(existingDate)) {
                managerAttendanceMap.set(managerId, record);
              }
            }
          });
          
          // Add all managers - show each manager only once with their latest attendance
          const finalData = managersData.map(m => {
            const managerId = m._id || m.id;
            const attendanceRecord = managerAttendanceMap.get(managerId);
            
            if (attendanceRecord) {
              return {
                ...attendanceRecord,
                id: managerId,
                name: m.name || attendanceRecord.name,
                mobile: m.mobile || m.phone || attendanceRecord.mobile,
                email: m.email || attendanceRecord.email,
                department: m.department || attendanceRecord.department || 'Manager',
                status: m.status || attendanceRecord.status
              };
            } else {
              // Manager without attendance
              return {
                id: managerId,
                recordId: `${managerId}-no-attendance`,
                name: m.name || 'Unknown',
                mobile: m.mobile || m.phone || '',
                email: m.email || '',
                date: '—',
                punchIn: null,
                punchOut: null,
                duration: null,
                status: m.status || 'unknown',
                department: m.department || 'Manager'
              };
            }
          });
          
          setAttendance(finalData);
          setManagersFallback(finalData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Unable to load manager data');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data = useMemo(() => {
    let source = attendance.length ? attendance : managersFallback;
    
    // Apply search filter
    if (search) {
      source = source.filter(r => 
        (r.name || '').toLowerCase().includes(search.toLowerCase()) || 
        (r.mobile || '').includes(search) ||
        (r.email || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Apply date filter
    if (dateFilter) {
      source = source.filter(r => {
        // Skip managers without attendance when filtering by date
        if (!r.punchIn && !r.date) return false;
        
        // Use the date field if available, otherwise extract from punchIn
        let recordDate;
        if (r.punchIn instanceof Date) {
          recordDate = r.punchIn;
        } else if (r.date && r.date !== '—') {
          recordDate = new Date(r.date);
        } else if (r.punchIn) {
          recordDate = new Date(r.punchIn);
        } else {
          return false;
        }
        
        if (isNaN(recordDate.getTime())) return false;
        
        // Convert record date to YYYY-MM-DD format for comparison
        const recordDateStr = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
        return recordDateStr === dateFilter;
      });
    }
    
    return source;
  }, [attendance, managersFallback, search, dateFilter]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Fetch all managers first
      const managersRes = await fetch(`${API_BASE}/api/managers?limit=1000`);
      let managersData = [];
      if (managersRes.ok) {
        const managersJson = await managersRes.json();
        managersData = managersJson.data || managersJson || [];
        if (!Array.isArray(managersData)) {
          managersData = [];
        }
        setAllManagers(managersData);
      }
      
      // Fetch from new attendance endpoint
      const attendanceRes = await fetch(`${API_BASE}/api/managers/attendance`);
      if (!attendanceRes.ok) {
        // Fallback: create attendance records from managers
        const attendanceData = managersData.map(m => {
          const loginDate = m.lastLogin ? new Date(m.lastLogin) : null;
          
          return {
            id: m._id || m.id,
            recordId: `${m._id || m.id}-${m.lastLogin || 'no-login'}`,
            name: m.name || 'Unknown',
            mobile: m.mobile || m.phone || '',
            email: m.email || '',
            date: loginDate ? formatDateOnly(loginDate) : (m.updatedAt ? formatDateOnly(new Date(m.updatedAt)) : '—'),
            punchIn: m.lastLogin || null,
            punchOut: m.lastLogout || null,
            duration: null,
            status: m.status || 'unknown',
            department: m.department || 'Manager'
          };
        });
        
        setAttendance(attendanceData);
        setManagersFallback(attendanceData);
        toast.success('Manager attendance reloaded');
        return;
      }
      
      const attendanceJson = await attendanceRes.json();
      const attendanceData = attendanceJson.data || [];
      
      // Group attendance records by manager ID and date
      // If a manager has multiple login/logout on the same day, combine them
      const attendanceByManagerAndDate = new Map();
      
      attendanceData.forEach(record => {
        const managerId = record.managerId || record.id;
        const recordDate = record.date ? formatDateOnly(record.date) : (record.loginTime ? formatDateOnly(record.loginTime) : null);
        const key = `${managerId}-${recordDate}`;
        
        if (!attendanceByManagerAndDate.has(key)) {
          attendanceByManagerAndDate.set(key, {
            id: managerId,
            recordId: record._id || `${managerId}-${recordDate}`,
            name: record.name || 'Unknown',
            mobile: record.mobile || '',
            email: record.email || '',
            date: recordDate || '—',
            punchIn: record.loginTime ? new Date(record.loginTime) : null,
            punchOut: record.logoutTime ? new Date(record.logoutTime) : null,
            duration: record.duration || 0,
            status: record.status || 'unknown',
            department: record.department || 'Manager',
            allLogins: record.loginTime ? [new Date(record.loginTime)] : [],
            allLogouts: record.logoutTime ? [new Date(record.logoutTime)] : []
          });
        } else {
          const existing = attendanceByManagerAndDate.get(key);
          // Update with earliest login and latest logout
          if (record.loginTime) {
            const loginTime = new Date(record.loginTime);
            if (!existing.punchIn || loginTime < existing.punchIn) {
              existing.punchIn = loginTime;
            }
            existing.allLogins.push(loginTime);
          }
          if (record.logoutTime) {
            const logoutTime = new Date(record.logoutTime);
            if (!existing.punchOut || logoutTime > existing.punchOut) {
              existing.punchOut = logoutTime;
            }
            existing.allLogouts.push(logoutTime);
          }
          // Sum up duration
          if (record.duration) {
            existing.duration += record.duration;
          }
        }
      });
      
      // Convert map to array
      const formattedData = Array.from(attendanceByManagerAndDate.values()).map(record => {
        // Remove temporary tracking properties
        const cleanRecord = { ...record };
        delete cleanRecord.allLogins;
        delete cleanRecord.allLogouts;
        
        return {
          ...cleanRecord,
          // Calculate total duration if we have punch in/out
          duration: record.punchIn && record.punchOut 
            ? Math.floor((record.punchOut - record.punchIn) / 60000) // duration in minutes
            : record.duration
        };
      });
      
      // Create a map of managers with their latest attendance
      const managerAttendanceMap = new Map();
      formattedData.forEach(record => {
        const managerId = record.id;
        if (!managerAttendanceMap.has(managerId)) {
          managerAttendanceMap.set(managerId, record);
        } else {
          // Keep the most recent attendance record
          const existing = managerAttendanceMap.get(managerId);
          const recordDate = record.punchIn || record.date;
          const existingDate = existing.punchIn || existing.date;
          if (recordDate && existingDate && new Date(recordDate) > new Date(existingDate)) {
            managerAttendanceMap.set(managerId, record);
          }
        }
      });
      
      // Add all managers - show each manager only once with their latest attendance
      const finalData = managersData.map(m => {
        const managerId = m._id || m.id;
        const attendanceRecord = managerAttendanceMap.get(managerId);
        
        if (attendanceRecord) {
          return {
            ...attendanceRecord,
            id: managerId,
            name: m.name || attendanceRecord.name,
            mobile: m.mobile || m.phone || attendanceRecord.mobile,
            email: m.email || attendanceRecord.email,
            department: m.department || attendanceRecord.department || 'Manager',
            status: m.status || attendanceRecord.status
          };
        } else {
          // Manager without attendance
          return {
            id: managerId,
            recordId: `${managerId}-no-attendance`,
            name: m.name || 'Unknown',
            mobile: m.mobile || m.phone || '',
            email: m.email || '',
            date: '—',
            punchIn: null,
            punchOut: null,
            duration: null,
            status: m.status || 'unknown',
            department: m.department || 'Manager'
          };
        }
      });
      
      setAttendance(finalData);
      setManagersFallback(finalData);
      toast.success('Manager attendance reloaded');
    } catch (err) {
      console.error('Refresh error:', err);
      toast.error('Failed to reload manager attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const headers = ['Manager ID','Name','Email','Mobile','Date','Login Time','Login Date','Logout Time','Logout Date','Duration','Status','Department'];
      const rows = data.map(r => [
        r.id||'', 
        r.name||'', 
        r.email||'',
        r.mobile||'', 
        r.date||'', 
        r.punchIn?formatTime(r.punchIn):'', 
        r.punchIn?formatDate(r.punchIn):'',
        r.punchOut?formatTime(r.punchOut):'', 
        r.punchOut?formatDate(r.punchOut):'', 
        computeDuration(r.punchIn, r.punchOut, r.duration), 
        r.status||'',
        r.department||''
      ]);
      const csv = [headers.join(','), ...rows.map(row => row.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `managers_attendance_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Exported manager attendance CSV');
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    }
  };

  const fetchAllManagers = async () => {
    // Use cached managers if available
    if (allManagers.length > 0) {
      return allManagers;
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/managers?limit=1000`);
      if (response.ok) {
        const result = await response.json();
        const managers = result.data || result || [];
        if (Array.isArray(managers) && managers.length > 0) {
          setAllManagers(managers);
        }
        return managers;
      }
      return [];
    } catch (err) {
      console.error('Error fetching all managers:', err);
      toast.error('Failed to fetch managers data');
      return [];
    }
  };

  const handleOpenSalaryModal = async (staff) => {
    setSelectedStaff(staff);
    setSalaryModalOpen(true);
    
    // Fetch all managers to get complete staff details including salary
    const managers = await fetchAllManagers();
    const fullStaffDetails = managers.find(m => (m._id || m.id) === staff.id);
    
    if (fullStaffDetails) {
      // Update selected staff with full details
      setSelectedStaff({
        ...staff,
        ...fullStaffDetails,
        salary: fullStaffDetails.salary || 0
      });
      // Set initial salary amount if available
      if (fullStaffDetails.salary) {
        setSalaryAmount(fullStaffDetails.salary);
      }
    }
    
    // Fetch salary/attendance data
    fetchSalaryData(staff, salaryMonth, salaryYear);
  };

  const fetchSalaryData = async (staff, month, year) => {
    if (!staff) return;
    
    setLoadingSalary(true);
    try {
      // Get manager ID (could be _id or id)
      const managerId = staff._id || staff.id;
      
      // Fetch salary data from backend API
      const response = await fetch(`${API_BASE}/api/managers/${managerId}/salary/${month}/${year}`);
      
      if (response.ok) {
        const result = await response.json();
        const salaryDataFromAPI = result.data;
        
        if (salaryDataFromAPI) {
          // Set salary amount from API
          if (salaryDataFromAPI.salaryAmount) {
            setSalaryAmount(salaryDataFromAPI.salaryAmount);
          }
          
          // Set attendance map and summary
          setSalaryData({
            attendanceMap: salaryDataFromAPI.attendanceMap || {},
            summary: salaryDataFromAPI.summary || {
              present: 0,
              absent: 0,
              halfDays: 0,
              casualLeave: 0,
              holiday: 0,
              sunday: 0,
              lop: 0,
              totalSalary: 0
            }
          });
        }
      } else {
        // If API fails, fallback to constructing attendance map from staff.attendanceRecords (if available)
        try {
          const error = await response.json();
          console.error('Error fetching salary data:', error);
        } catch (err) {
          console.error('Error parsing salary fetch error:', err);
        }

        // Build fallback attendance map using staff.attendanceRecords
        const daysInMonth = new Date(year, month, 0).getDate();
        const fallbackMap = {};
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, month - 1, d);
          fallbackMap[d.toString()] = date.getDay() === 0 ? 'S' : 'A';
        }

        if (staff && staff.attendanceRecords && staff.attendanceRecords.length > 0) {
          staff.attendanceRecords.forEach((rec) => {
            if (!rec.date) return;
            const recDate = new Date(rec.date);
            if (recDate.getFullYear() === year && recDate.getMonth() + 1 === month) {
              fallbackMap[recDate.getDate().toString()] = 'P';
            }
          });
        }

        const salaryAmt = (staff && (staff.salary || staff.salary === 0)) ? staff.salary : 0;
        setSalaryAmount(salaryAmt);
        setSalaryData({
          attendanceMap: fallbackMap,
          summary: recalculateSummary(fallbackMap, month, year, salaryAmt)
        });
        toast.error('Failed to load salary data from server — using fallback from attendance records');
      }
    } catch (err) {
      console.error('Error fetching salary data:', err);
      toast.error('Failed to load salary data');
    } finally {
      setLoadingSalary(false);
    }
  };

  // Refetch salary data when month or year changes
  useEffect(() => {
    if (salaryModalOpen && selectedStaff) {
      fetchSalaryData(selectedStaff, salaryMonth, salaryYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salaryMonth, salaryYear]);

  // Recalculate total salary when salary amount changes
  useEffect(() => {
    if (salaryData && salaryData.attendanceMap) {
      const newSummary = recalculateSummary(salaryData.attendanceMap, salaryMonth, salaryYear, salaryAmount);
      setSalaryData({
        ...salaryData,
        summary: newSummary
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salaryAmount]);

  const handleSaveSalary = async () => {
    if (!selectedStaff || !salaryData) return;
    
    setLoadingSalary(true);
    try {
      // Get manager ID (could be _id or id)
      const managerId = selectedStaff._id || selectedStaff.id;
      
      // Save salary data via API
      const response = await fetch(`${API_BASE}/api/managers/${managerId}/salary/${salaryMonth}/${salaryYear}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendanceMap: salaryData.attendanceMap,
          salaryAmount: salaryAmount
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        // Update local state with saved data
        if (result.data) {
          setSalaryData({
            attendanceMap: result.data.attendanceMap || salaryData.attendanceMap,
            summary: result.data.summary || salaryData.summary
          });
        }
        toast.success(`Salary saved for ${selectedStaff.name}`);
      } else {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to save salary');
      }
    } catch (err) {
      console.error('Error saving salary:', err);
      toast.error(err.message || 'Failed to save salary');
    } finally {
      setLoadingSalary(false);
    }
  };

  const getMonthName = (month) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || '';
  };

  const recalculateSummary = (attendanceMap, month, year, monthlySalary = 0) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    let present = 0;
    let absent = 0;
    let halfDays = 0;
    let casualLeave = 0;
    let holiday = 0;
    let sunday = 0;
    let lop = 0;
    
    // Count working days (excluding Sundays)
    let totalWorkingDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const status = attendanceMap[day] || 'A';
      
      if (dayOfWeek === 0) {
        sunday++;
      } else {
        totalWorkingDays++;
        if (status === 'P') {
          present++;
        } else if (status === 'H') {
          halfDays++;
        } else if (status === 'CL') {
          casualLeave++;
        } else if (status === 'HD') {
          holiday++;
        } else if (status === 'LOP') {
          lop++;
        } else if (status === 'A') {
          absent++;
        }
      }
    }
    
    // Calculate total salary based on attendance
    // Formula: (Present + Casual Leave + Holiday) * full day salary + (Half Days) * half day salary
    // Sunday and LOP are not paid, Absent is not paid
    let totalSalary = 0;
    if (monthlySalary > 0 && totalWorkingDays > 0) {
      const salaryPerDay = monthlySalary / totalWorkingDays;
      const fullDays = present + casualLeave + holiday;
      const halfDaySalary = salaryPerDay / 2;
      
      totalSalary = (fullDays * salaryPerDay) + (halfDays * halfDaySalary);
      totalSalary = Math.round(totalSalary * 100) / 100; // Round to 2 decimal places
    }
    
    return {
      present,
      absent,
      halfDays,
      casualLeave,
      holiday,
      sunday,
      lop,
      totalSalary
    };
  };

  const renderCalendar = () => {
    if (!salaryData) return null;
    
    const daysInMonth = new Date(salaryYear, salaryMonth, 0).getDate();
    const firstDay = new Date(salaryYear, salaryMonth - 1, 1).getDay();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const calendarDays = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(salaryYear, salaryMonth - 1, day);
      const dayOfWeek = date.getDay();
      const status = salaryData.attendanceMap[day] || (dayOfWeek === 0 ? 'S' : 'A');
      
      calendarDays.push(
        <div key={day} className="p-2 border border-gray-200">
          <div className="text-sm font-medium mb-1">{day}</div>
          <select
            value={status}
            onChange={async (e) => {
              const newStatus = e.target.value;
              const newMap = { ...salaryData.attendanceMap };
              newMap[day] = newStatus;
              const newSummary = recalculateSummary(newMap, salaryMonth, salaryYear, salaryAmount);
              
              // Update local state immediately
              setSalaryData({
                ...salaryData,
                attendanceMap: newMap,
                summary: newSummary
              });
              
              // Save to backend
              if (selectedStaff) {
                try {
                  const managerId = selectedStaff._id || selectedStaff.id;
                  const response = await fetch(`${API_BASE}/api/managers/${managerId}/salary/${salaryMonth}/${salaryYear}/attendance`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      day: day.toString(),
                      status: newStatus
                    })
                  });
                  
                  if (response.ok) {
                    const result = await response.json();
                    // Update with server-calculated summary
                    if (result.data) {
                      setSalaryData({
                        attendanceMap: result.data.attendanceMap || newMap,
                        summary: result.data.summary || newSummary
                      });
                    }
                  }
                } catch (err) {
                  console.error('Error saving attendance:', err);
                  // Don't show error toast for individual day changes to avoid spam
                }
              }
            }}
            className="w-full text-xs border border-gray-300 rounded px-1 py-1"
            disabled={dayOfWeek === 0}
          >
            <option value="P">P</option>
            <option value="A">A</option>
            <option value="H">H</option>
            <option value="CL">CL</option>
            <option value="HD">HD</option>
            <option value="S">S</option>
            <option value="LOP">LOP</option>
          </select>
        </div>
      );
    }
    
    return (
      <div className="mt-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {days.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 p-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold">Manager Attendance</h2>
          <Badge variant={attendance.length ? 'success' : 'secondary'}>{attendance.length ? `${attendance.length} records` : '-'}</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email or mobile"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64 pl-9 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="pl-9 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Filter by date"
            />
          </div>
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear Date
            </button>
          )}
          <button className="btn" onClick={handleRefresh} title="Reload"><RefreshCw /></button>
          <button className="btn" onClick={handleExport} title="Export to CSV"><Download /></button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manager Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Manager</TableHead>
                <TableHead>Email</TableHead>
                {/* <TableHead>Mobile</TableHead>
                <TableHead>Date</TableHead> */}
                <TableHead>Login Time</TableHead>
                <TableHead>Logout Time</TableHead>
                <TableHead>Duration</TableHead>
                {/* <TableHead>Status</TableHead> */}
                <TableHead>Department</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                    {loading ? 'Loading attendance records...' : 'No attendance records found.'}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.recordId || `${row.id}-${row.punchIn || 'no-attendance'}`}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.email || '—'}</TableCell>
                    {/* <TableCell>{row.mobile || '—'}</TableCell> */}
                    {/* <TableCell className="whitespace-nowrap">
                      {row.date || (row.punchIn ? formatDateOnly(row.punchIn) : '—')}
                    </TableCell> */}
                    <TableCell className="whitespace-nowrap">
                      {row.punchIn ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{formatTime(row.punchIn)}</span>
                          <span className="text-xs text-gray-500">{formatDate(row.punchIn)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.punchOut ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{formatTime(row.punchOut)}</span>
                          <span className="text-xs text-gray-500">{formatDate(row.punchOut)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.punchIn ? (
                        <span className="font-medium">{computeDuration(row.punchIn, row.punchOut, row.duration)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    {/* <TableCell>
                      <Badge variant={row.status === 'Active' ? 'success' : 'secondary'}>
                        {row.status || 'unknown'}
                      </Badge>
                    </TableCell> */}
                    <TableCell>{row.department || '—'}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleOpenSalaryModal(row)}
                        className="btn btn-sm btn-primary flex items-center gap-1"
                        title="View Salary Report"
                      >
                        Salary
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Salary Report Modal */}
      <Modal
        isOpen={salaryModalOpen}
        onClose={() => {
          setSalaryModalOpen(false);
          setSelectedStaff(null);
          setSalaryData(null);
        }}
        className="max-w-4xl"
        title={
          selectedStaff ? (
            <div className="flex items-center justify-between w-full">
              <div>
                <h3 className="text-lg font-semibold">
                  Salary Report of {selectedStaff.name} ({selectedStaff.mobile || 'N/A'})
                </h3>
              </div>
            </div>
          ) : (
            'Salary Report'
          )
        }
      >
        {selectedStaff && (
          <div className="space-y-6">
            {/* Month and Year Selection */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Month:</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={salaryMonth}
                  onChange={(e) => setSalaryMonth(parseInt(e.target.value) || 1)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Year:</label>
                <input
                  type="number"
                  min="2020"
                  max="2100"
                  value={salaryYear}
                  onChange={(e) => setSalaryYear(parseInt(e.target.value) || new Date().getFullYear())}
                  className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                />
              </div>
              {/* <button
                onClick={handleGetSalaryDetails}
                className="btn btn-primary px-4 py-1"
                disabled={loadingSalary}
              >
                Get Details
              </button> */}
            </div>

            {loadingSalary ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading salary data...</p>
              </div>
            ) : salaryData ? (
              <>
                {/* Attendance Summary */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-green-50 p-3 rounded-md">
                    <div className="text-sm text-gray-600">Present</div>
                    <div className="text-2xl font-bold text-green-600">{salaryData.summary.present}</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-md">
                    <div className="text-sm text-gray-600">Absent</div>
                    <div className="text-2xl font-bold text-red-600">{salaryData.summary.absent}</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-md">
                    <div className="text-sm text-gray-600">Half Days</div>
                    <div className="text-2xl font-bold text-blue-600">{salaryData.summary.halfDays}</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-md">
                    <div className="text-sm text-gray-600">Casual Leave</div>
                    <div className="text-2xl font-bold text-purple-600">{salaryData.summary.casualLeave}</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-md">
                    <div className="text-sm text-gray-600">Holiday</div>
                    <div className="text-2xl font-bold text-red-600">{salaryData.summary.holiday}</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-md">
                    <div className="text-sm text-gray-600">Sunday</div>
                    <div className="text-2xl font-bold text-red-600">{salaryData.summary.sunday}</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-md">
                    <div className="text-sm text-gray-600">LOP</div>
                    <div className="text-2xl font-bold text-red-600">{salaryData.summary.lop}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-md">
                    <div className="text-sm text-gray-600">Total Salary</div>
                    <div className="text-2xl font-bold text-green-600">
                      {salaryData.summary.totalSalary ? `₹${salaryData.summary.totalSalary.toLocaleString('en-IN')}` : '₹0'}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  Attendance of {salaryMonth} - {salaryYear}
                </div>

                {/* Salary Input */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">
                    Salary of {selectedStaff.name} for {getMonthName(salaryMonth)}-{salaryYear}:
                  </label>
                  <input
                    type="number"
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(parseFloat(e.target.value) || 0)}
                    className="w-32 px-2 py-1 border border-gray-300 rounded-md"
                    placeholder="0"
                  />
                </div>

                {/* Calendar View */}
                {renderCalendar()}

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={handleSaveSalary}
                    className="btn btn-primary px-6 py-2"
                    disabled={loadingSalary}
                  >
                    Save
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Click "Get Details" to load salary data
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}