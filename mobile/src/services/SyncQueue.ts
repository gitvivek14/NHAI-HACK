import {AttendanceEvent, SyncResponse} from '../types';

export class SyncQueue {
  async syncNow(params: {
    backendUrl: string;
    events: AttendanceEvent[];
    online: boolean;
  }): Promise<SyncResponse> {
    const pendingOrFailed = params.events.filter(
      event => event.syncStatus !== 'synced',
    );
    const syncedAt = new Date().toISOString();

    if (!params.online) {
      return {
        accepted: [],
        failed: pendingOrFailed.map(event => ({
          deviceEventId: event.deviceEventId,
          reason: 'Device is offline',
        })),
        syncedAt,
      };
    }

    if (params.events.length === 0) {
      return {accepted: [], failed: [], syncedAt};
    }

    try {
      const baseUrl = params.backendUrl.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/sync/events`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({events: params.events}),
      });

      if (!response.ok) {
        throw new Error(`Sync failed with HTTP ${response.status}`);
      }

      return (await response.json()) as SyncResponse;
    } catch (error) {
      return {
        accepted: [],
        failed: params.events.map(event => ({
          deviceEventId: event.deviceEventId,
          reason:
            error instanceof Error
              ? error.message
              : 'Backend sync request failed',
        })),
        syncedAt,
      };
    }
  }
}
