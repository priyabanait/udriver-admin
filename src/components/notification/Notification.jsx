import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function SendNotification() {
  const { user: auth } = useAuth();
  const [sendMode, setSendMode] = useState("all"); // "all" or "specific"
  
  const [apps, setApps] = useState({
    customer: true,
    driver: false,
  });

  const [sameMessage, setSameMessage] = useState(true);

  // Specific user selection
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [selectedInvestors, setSelectedInvestors] = useState([]);
  const [driverSearch, setDriverSearch] = useState("");
  const [investorSearch, setInvestorSearch] = useState("");
  const [drivers, setDrivers] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [commonData, setCommonData] = useState({
    title: "",
    message: "",
    link: "",
  });

  const [investorData, setInvestorData] = useState({
    title: "",
    message: "",
    link: "",
  });

  const [driverData, setDriverData] = useState({
    title: "",
    message: "",
    link: "",
  });

  const [sendType, setSendType] = useState("now");
  const [scheduledTime, setScheduledTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch drivers and investors for selection
  useEffect(() => {
    if (sendMode !== "specific") {
      // Clear data when switching away from specific mode
      setDrivers([]);
      setInvestors([]);
      return;
    }

    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const token = auth?.token || localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Only fetch drivers if Driver App is selected
        // Only fetch investors if Investor App is selected
        const fetchPromises = [];
        
        if (apps.customer) {
          fetchPromises.push(
            axios.get(`${API_BASE}/api/notifications/admin/drivers`, {
              headers,
              params: { search: driverSearch || '', limit: 50 }
            }).catch(err => {
              console.error("Error fetching drivers:", err.response?.data || err.message);
              return { data: { drivers: [] } };
            })
          );
        } else {
          fetchPromises.push(Promise.resolve({ data: { drivers: [] } }));
        }

        if (apps.driver) {
          fetchPromises.push(
            axios.get(`${API_BASE}/api/notifications/admin/investors`, {
              headers,
              params: { search: investorSearch || '', limit: 50 }
            }).catch(err => {
              console.error("Error fetching investors:", err.response?.data || err.message);
              return { data: { investors: [] } };
            })
          );
        } else {
          fetchPromises.push(Promise.resolve({ data: { investors: [] } }));
        }

        const [driversRes, investorsRes] = await Promise.all(fetchPromises);

        const driversData = driversRes.data?.drivers || [];
        const investorsData = investorsRes.data?.investors || [];
        
        console.log(`Fetched ${driversData.length} drivers and ${investorsData.length} investors`);
        
        setDrivers(driversData);
        setInvestors(investorsData);
      } catch (err) {
        console.error("Error fetching users:", err);
        setDrivers([]);
        setInvestors([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    // Debounce search queries, but fetch immediately when switching to specific mode
    const isInitialLoad = sendMode === "specific" && driverSearch === "" && investorSearch === "";
    const timeoutId = setTimeout(() => {
      fetchUsers();
    }, isInitialLoad ? 0 : 300); // No delay for initial load, 300ms debounce for search

    return () => clearTimeout(timeoutId);
  }, [sendMode, driverSearch, investorSearch, apps.customer, apps.driver, auth?.token]);

  const handleSend = async () => {
    // Validation
    if (sendMode === "all") {
      const selectedApps = Object.keys(apps).filter((key) => apps[key]);
      if (selectedApps.length === 0) {
        setError("Please select at least one app");
        return;
      }
    } else {
      // Check if at least one app is selected
      const selectedApps = Object.keys(apps).filter((key) => apps[key]);
      if (selectedApps.length === 0) {
        setError("Please select at least one app (Driver App or Investor App)");
        return;
      }

      // Check if users are selected for the selected apps
      if (apps.customer && selectedDrivers.length === 0 && apps.driver && selectedInvestors.length === 0) {
        setError("Please select at least one driver or investor");
        return;
      }
      if (apps.customer && selectedDrivers.length === 0 && !apps.driver) {
        setError("Please select at least one driver");
        return;
      }
      if (apps.driver && selectedInvestors.length === 0 && !apps.customer) {
        setError("Please select at least one investor");
        return;
      }
    }

    if (sameMessage) {
      if (!commonData.title && !commonData.message) {
        setError("Please provide at least a title or message");
        return;
      }
    } else {
      // Determine which app(s) we are actually sending to
      const sendingToDrivers = (sendMode === 'all' && apps.customer) || (sendMode === 'specific' && selectedDrivers.length > 0);
      const sendingToInvestors = (sendMode === 'all' && apps.driver) || (sendMode === 'specific' && selectedInvestors.length > 0);

      if (sendingToDrivers && !driverData.title && !driverData.message) {
        setError("Please provide title or message for Driver App");
        return;
      }
      if (sendingToInvestors && !investorData.title && !investorData.message) {
        setError("Please provide title or message for Investor App");
        return;
      }
    }

    if (sendType === "schedule" && !scheduledTime) {
      setError("Please select a scheduled time");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = auth?.token || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (sendMode === "specific") {
        // Send to specific users
        if (sameMessage) {
          const payload = {
            driverIds: selectedDrivers.map(d => d._id),
            investorIds: selectedInvestors.map(i => i._id),
            title: commonData.title,
            message: commonData.message,
            link: commonData.link,
            sendType,
            ...(sendType === "schedule" && { scheduledTime })
          };

          console.log("Sending notification to specific users (common):", payload);

          const response = await axios.post(
            `${API_BASE}/api/notifications/admin/send-specific`,
            payload,
            { headers }
          );

          console.log("Notification sent successfully:", response.data);
          setSuccess(
            `Notifications sent successfully! ${response.data.results?.length || 0} notification(s) processed.`
          );

        } else {
          // When different messages for driver/investor are provided, send separate requests
          const requests = [];

          if (selectedDrivers.length > 0) {
            const payloadDriver = {
              driverIds: selectedDrivers.map(d => d._id),
              title: driverData.title,
              message: driverData.message,
              link: driverData.link,
              sendType,
              ...(sendType === "schedule" && { scheduledTime })
            };
            console.log('Sending driver-specific notification:', payloadDriver);
            requests.push(axios.post(`${API_BASE}/api/notifications/admin/send-specific`, payloadDriver, { headers }).catch(err => ({ error: err })));
          }

          if (selectedInvestors.length > 0) {
            const payloadInvestor = {
              investorIds: selectedInvestors.map(i => i._id),
              title: investorData.title,
              message: investorData.message,
              link: investorData.link,
              sendType,
              ...(sendType === "schedule" && { scheduledTime })
            };
            console.log('Sending investor-specific notification:', payloadInvestor);
            requests.push(axios.post(`${API_BASE}/api/notifications/admin/send-specific`, payloadInvestor, { headers }).catch(err => ({ error: err })));
          }

          const responses = await Promise.all(requests);

          let processed = 0;
          const errors = [];
          responses.forEach(r => {
            if (r && r.data && r.data.results) processed += (r.data.results.length || 0);
            if (r && r.error) errors.push(r.error.message || r.error.toString());
            if (r && r.data && r.data.errors) errors.push(...(r.data.errors.map(e => e.error || JSON.stringify(e))));
          });

          setSuccess(`Notifications sent successfully! ${processed} notification(s) processed.`);
          if (errors.length) setError(`Some notifications failed: ${errors[0]}`);
        }

        // Reset form after successful send
        setTimeout(() => {
          setCommonData({ title: "", message: "", link: "" });
          setDriverData({ title: "", message: "", link: "" });
          setInvestorData({ title: "", message: "", link: "" });
          setSelectedDrivers([]);
          setSelectedInvestors([]);
          setSuccess("");
          setError("");
        }, 3000);
      } else {
        // Send to all users of selected apps
        const selectedApps = Object.keys(apps).filter((key) => apps[key]);
        const payload = {
          apps: selectedApps,
          sendType,
          ...(sendType === "schedule" && { scheduledTime }),
          data: sameMessage
            ? { common: commonData }
            : {
                driver: driverData,
                investor: investorData,
              },
        };

        console.log("Sending notification payload:", payload);

        const response = await axios.post(
          `${API_BASE}/api/notifications/admin/send`,
          payload,
          { headers }
        );

        console.log("Notification sent successfully:", response.data);
        setSuccess(
          `Notifications sent successfully! ${response.data.results?.length || 0} notification(s) processed.`
        );

        // Reset form after successful send
        setTimeout(() => {
          setCommonData({ title: "", message: "", link: "" });
          setDriverData({ title: "", message: "", link: "" });
          setInvestorData({ title: "", message: "", link: "" });
          setSuccess("");
        }, 3000);
      }
    } catch (err) {
      console.error("Error sending notification:", err);
      setError(
        err.response?.data?.message || err.message || "Failed to send notification"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Send Notification</h1>

      {/* SEND MODE SELECTION */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-semibold mb-3">Send Mode</h2>
        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={sendMode === "all"}
              onChange={() => setSendMode("all")}
            />
            Send to All Users
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={sendMode === "specific"}
              onChange={() => setSendMode("specific")}
            />
            Send to Specific Users
          </label>
        </div>
      </div>

      {sendMode === "all" ? (
        <>
          {/* APP SELECTION */}
          <div className="bg-white rounded-xl shadow p-5 mb-6">
            <h2 className="font-semibold mb-3">Select Apps</h2>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={apps.customer}
                  onChange={(e) =>
                    setApps({ ...apps, customer: e.target.checked })
                  }
                />
                Driver App
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={apps.driver}
                  onChange={(e) =>
                    setApps({ ...apps, driver: e.target.checked })
                  }
                />
                Investor App
              </label>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* APP SELECTION FOR SPECIFIC MODE */}
          <div className="bg-white rounded-xl shadow p-5 mb-6">
            <h2 className="font-semibold mb-3">Select Apps</h2>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={apps.customer}
                  onChange={(e) => {
                    setApps({ ...apps, customer: e.target.checked });
                    // Clear selected drivers when unchecking
                    if (!e.target.checked) {
                      setSelectedDrivers([]);
                      setDriverSearch("");
                    }
                  }}
                />
                Driver App
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={apps.driver}
                  onChange={(e) => {
                    setApps({ ...apps, driver: e.target.checked });
                    // Clear selected investors when unchecking
                    if (!e.target.checked) {
                      setSelectedInvestors([]);
                      setInvestorSearch("");
                    }
                  }}
                />
                Investor App
              </label>
            </div>
          </div>

          {/* SPECIFIC USER SELECTION */}
          {apps.customer && (
            <div className="bg-white rounded-xl shadow p-5 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Select Drivers</h2>
              <button
                onClick={() => {
                  setDriverSearch("");
                  // Trigger fetch by clearing and resetting
                  const fetchDrivers = async () => {
                    setLoadingUsers(true);
                    try {
                      const token = auth?.token || localStorage.getItem('token');
                      const headers = token ? { Authorization: `Bearer ${token}` } : {};
                      const driversRes = await axios.get(`${API_BASE}/api/notifications/admin/drivers`, {
                        headers,
                        params: { search: '', limit: 50 }
                      });
                      setDrivers(driversRes.data?.drivers || []);
                    } catch (err) {
                      console.error("Error fetching drivers:", err);
                      setDrivers([]);
                    } finally {
                      setLoadingUsers(false);
                    }
                  };
                  fetchDrivers();
                }}
                className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 border border-blue-300 rounded hover:bg-blue-50"
              >
                Refresh
              </button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search drivers by name, phone, or email..."
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>
            <div className="max-h-60 overflow-y-auto border rounded-lg p-2">
              {loadingUsers ? (
                <div className="text-center py-4">Loading...</div>
              ) : drivers.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No drivers found</div>
              ) : (
                drivers.map((driver) => (
                  <label
                    key={driver._id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDrivers.some(d => d._id === driver._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDrivers([...selectedDrivers, driver]);
                        } else {
                          setSelectedDrivers(selectedDrivers.filter(d => d._id !== driver._id));
                        }
                      }}
                    />
                    <span>
                      {driver.name || 'N/A'} - {driver.phone || driver.mobile || 'N/A'}
                      {driver.email && ` (${driver.email})`}
                    </span>
                  </label>
                ))
              )}
            </div>
            {selectedDrivers.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Selected Drivers ({selectedDrivers.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDrivers.map((driver) => (
                    <span
                      key={driver._id}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {driver.name || driver.phone}
                      <button
                        onClick={() => setSelectedDrivers(selectedDrivers.filter(d => d._id !== driver._id))}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          )}

          {apps.driver && (
            <div className="bg-white rounded-xl shadow p-5 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Select Investors</h2>
              <button
                onClick={() => {
                  setInvestorSearch("");
                  // Trigger fetch by clearing and resetting
                  const fetchInvestors = async () => {
                    setLoadingUsers(true);
                    try {
                      const token = auth?.token || localStorage.getItem('token');
                      const headers = token ? { Authorization: `Bearer ${token}` } : {};
                      const investorsRes = await axios.get(`${API_BASE}/api/notifications/admin/investors`, {
                        headers,
                        params: { search: '', limit: 50 }
                      });
                      setInvestors(investorsRes.data?.investors || []);
                    } catch (err) {
                      console.error("Error fetching investors:", err);
                      setInvestors([]);
                    } finally {
                      setLoadingUsers(false);
                    }
                  };
                  fetchInvestors();
                }}
                className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 border border-blue-300 rounded hover:bg-blue-50"
              >
                Refresh
              </button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search investors by name, phone, or email..."
                value={investorSearch}
                onChange={(e) => setInvestorSearch(e.target.value)}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>
            <div className="max-h-60 overflow-y-auto border rounded-lg p-2">
              {loadingUsers ? (
                <div className="text-center py-4">Loading...</div>
              ) : investors.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No investors found</div>
              ) : (
                investors.map((investor) => (
                  <label
                    key={investor._id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedInvestors.some(i => i._id === investor._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedInvestors([...selectedInvestors, investor]);
                        } else {
                          setSelectedInvestors(selectedInvestors.filter(i => i._id !== investor._id));
                        }
                      }}
                    />
                    <span>
                      {investor.investorName || 'N/A'} - {investor.phone || 'N/A'}
                      {investor.email && ` (${investor.email})`}
                    </span>
                  </label>
                ))
              )}
            </div>
            {selectedInvestors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Selected Investors ({selectedInvestors.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {selectedInvestors.map((investor) => (
                    <span
                      key={investor._id}
                      className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {investor.investorName || investor.phone}
                      <button
                        onClick={() => setSelectedInvestors(selectedInvestors.filter(i => i._id !== investor._id))}
                        className="text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          )}
        </>
      )}

      {/* SAME MESSAGE TOGGLE (shown only when both apps are selected) */}
      {(apps.customer && apps.driver) && (
        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <label className="flex items-center gap-3 font-medium">
            <input
              type="checkbox"
              checked={sameMessage}
              onChange={() => setSameMessage(!sameMessage)}
            />
            {sendMode === 'all' ? 'Use same message for both apps' : 'Use same message for selected apps'}
          </label>
        </div>
      )}

      {/* CONTENT */}
      {sameMessage ? (
        <NotificationForm
          title="Common Notification"
          data={commonData}
          setData={setCommonData}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {apps.customer && (
            <NotificationForm
              title={`Driver App Notification ${selectedDrivers.length > 0 ? `(${selectedDrivers.length} selected)` : ''}`}
              data={driverData}
              setData={setDriverData}
            />
          )}
          {apps.driver && (
            <NotificationForm
              title={`Investor App Notification ${selectedInvestors.length > 0 ? `(${selectedInvestors.length} selected)` : ''}`}
              data={investorData}
              setData={setInvestorData}
            />
          )}
        </div>
      )}

      {/* SEND TYPE */}
      <div className="bg-white rounded-xl shadow p-5 mt-6">
        <h2 className="font-semibold mb-3">Send Type</h2>
        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={sendType === "now"}
              onChange={() => setSendType("now")}
            />
            Send Now
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={sendType === "schedule"}
              onChange={() => setSendType("schedule")}
            />
            Schedule
          </label>
        </div>
        {sendType === "schedule" && (
          <div>
            <label className="block text-sm font-medium mb-2">Scheduled Time</label>
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        )}
      </div>

      {/* ERROR/SUCCESS MESSAGES */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mt-4">
          {success}
        </div>
      )}

      {/* SUMMARY */}
      <div className="text-sm text-gray-600 mt-3">
        {sendMode === 'all' ? (
          `Will send to: ${Object.keys(apps).filter(k => apps[k]).map(k => (k === 'customer' ? 'Driver App' : 'Investor App')).join(', ') || 'None'}`
        ) : (
          `Will send to: ${selectedDrivers.length} driver(s)${selectedInvestors.length > 0 ? `, ${selectedInvestors.length} investor(s)` : ''}`
        )}
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex justify-end gap-4 mt-6">
        <button
          onClick={handleSend}
          disabled={loading}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Sending..." : "Send Notification"}
        </button>
      </div>
    </div>
  );
}

/* ------------------ SUB COMPONENT ------------------ */

function NotificationForm({ title, data, setData }) {
  return (
    <div className="bg-white rounded-xl shadow p-5 mb-6">
      <h2 className="font-semibold mb-4">{title}</h2>

      <input
        className="w-full border rounded-lg px-4 py-2 mb-3"
        placeholder="Notification Title"
        value={data.title}
        onChange={(e) => setData({ ...data, title: e.target.value })}
      />

      <textarea
        className="w-full border rounded-lg px-4 py-2 mb-3"
        placeholder="Notification Message"
        rows={4}
        value={data.message}
        onChange={(e) => setData({ ...data, message: e.target.value })}
      />

      <input
        className="w-full border rounded-lg px-4 py-2"
        placeholder="Deep Link (optional)"
        value={data.link}
        onChange={(e) => setData({ ...data, link: e.target.value })}
      />
    </div>
  );
}
