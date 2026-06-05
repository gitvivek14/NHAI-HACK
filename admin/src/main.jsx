import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

function useAdminData() {
  const [data, setData] = useState({
    summary: null,
    events: [],
    workers: [],
    devices: [],
  });
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const [summary, events, workers, devices] = await Promise.all([
      fetch(`${API_URL}/api/admin/summary`).then(response => response.json()),
      fetch(`${API_URL}/api/admin/events`).then(response => response.json()),
      fetch(`${API_URL}/api/admin/workers`).then(response => response.json()),
      fetch(`${API_URL}/api/admin/devices`).then(response => response.json()),
    ]);
    setData({summary, events, workers, devices});
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  return {data, loading, refresh};
}

function App() {
  const {data, loading, refresh} = useAdminData();
  const failedLiveness = useMemo(
    () => data.events.filter(event => !event.livenessPassed).length,
    [data.events],
  );

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">NHAI Field Attendance Console</p>
          <h1>NHAI FieldAuth Admin</h1>
        </div>
        <button onClick={refresh}>{loading ? 'Refreshing' : 'Refresh'}</button>
      </header>

      <section className="metrics">
        <Metric label="Workers" value={data.summary?.workers ?? 0} />
        <Metric label="Attendance events" value={data.summary?.events ?? 0} />
        <Metric label="Devices" value={data.summary?.devices ?? 0} />
        <Metric label="Failed liveness" value={failedLiveness} tone={failedLiveness ? 'bad' : 'good'} />
      </section>

      <section className="panel">
        <div className="panelHeader">
          <h2>Attendance Events</h2>
          <span>{data.events.length} synced</span>
        </div>
        <Table
          columns={['Worker', 'Personnel ID', 'Device', 'Similarity', 'Liveness', 'Latency', 'Verified']}
          rows={data.events.map(event => [
            event.workerName,
            event.personnelId,
            event.deviceId,
            Number(event.similarity ?? 0).toFixed(2),
            event.livenessPassed ? 'Passed' : 'Failed',
            `${event.latencyMs} ms`,
            new Date(event.verifiedAt).toLocaleString(),
          ])}
        />
      </section>

      <section className="grid">
        <section className="panel">
          <h2>Workers</h2>
          <Table
            columns={['Personnel ID', 'Name', 'Source device']}
            rows={data.workers.map(worker => [
              worker.personnelId,
              worker.name,
              worker.sourceDeviceId,
            ])}
          />
        </section>

        <section className="panel">
          <h2>Devices</h2>
          <Table
            columns={['Device ID', 'Last sync']}
            rows={data.devices.map(device => [
              device.id,
              device.lastSyncAt ? new Date(device.lastSyncAt).toLocaleString() : 'Never',
            ])}
          />
        </section>
      </section>
    </main>
  );
}

function Metric({label, value, tone = 'neutral'}) {
  return (
    <article className={`metric ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function Table({columns, rows}) {
  if (!rows.length) {
    return <p className="empty">No data yet. Sync a field device to populate this table.</p>;
  }

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>{columns.map(column => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
