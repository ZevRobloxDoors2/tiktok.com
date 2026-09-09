import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { getUsers, getReports, saveReports, getAppeals, saveAppeals, getAuditLogs, saveAuditLogs, saveUsers, getVideos, saveVideos } from '../lib/db';
import { User, Report, Appeal, AuditLog, Video } from '../types';
import { ShieldAlert, AlertTriangle, Users, FileText, CheckCircle, XCircle, Trash2, Ban, Search, Filter, RotateCcw } from 'lucide-react';
import { getDeviceId } from '../lib/utils';

export function Admin() {
  const { currentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'appeals' | 'logs'>('reports');
  
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  
  const [logSearch, setLogSearch] = useState('');
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    action: () => Promise<void>;
    requireReason: boolean;
  }>({ isOpen: false, title: '', action: async () => {}, requireReason: false });
  const [actionReason, setActionReason] = useState('');
  
  const isOwner = currentUser?.role === 'owner';
  const isMod = isOwner || currentUser?.role === 'staff';

  const loadData = async () => {
    setReports(await getReports());
    setUsers(await getUsers());
    setAppeals(await getAppeals());
    setLogs(await getAuditLogs());
    setVideos(await getVideos());
  };

  useEffect(() => {
    if (isMod) loadData();
  }, [isMod]);

  if (!isMod) {
    return <div className="p-8 text-center text-red-500 font-bold">Access Denied</div>;
  }

  const logAction = async (action: string, targetId: string, details: string) => {
    const allLogs = await getAuditLogs();
    allLogs.push({
      id: `log_${Date.now()}`,
      action,
      adminId: currentUser!.id,
      targetId,
      details,
      timestamp: Date.now()
    });
    await saveAuditLogs(allLogs);
    setLogs(allLogs);
  };

  const redoAuditAction = async (log: AuditLog) => {
    if (!isOwner || log.reverted) return;
    const allUsers = await getUsers();
    const allReports = await getReports();
    const allAppeals = await getAppeals();
    const user = allUsers.find(item => item.id === log.targetId);
    const report = allReports.find(item => item.id === log.targetId);
    const appeal = allAppeals.find(item => item.id === log.targetId);

    if (log.action === 'promote_staff' && user) user.role = 'staff';
    if (log.action === 'remove_staff' && user) user.role = 'user';
    if (log.action === 'ban_user' && user) {
      const type = log.details.includes('(hwid)') ? 'hwid' : log.details.includes('(temp)') ? 'temp' : 'perm';
      user.banStatus = { type, reason: `Redone by owner from audit log ${log.id}`, linkedAccount: type === 'hwid' ? user.handle : undefined };
    }
    if (log.action === 'report_accepted' && report) report.status = 'accepted';
    if (log.action === 'report_rejected' && report) report.status = 'rejected';
    if (log.action === 'appeal_accepted' && appeal) appeal.status = 'accepted';
    if (log.action === 'appeal_rejected' && appeal) appeal.status = 'rejected';

    if (user) await saveUsers(allUsers);
    if (report) await saveReports(allReports);
    if (appeal) await saveAppeals(allAppeals);
    const allLogs = await getAuditLogs();
    allLogs.push({
      id: `log_${Date.now()}`,
      action: 'redo_action',
      adminId: currentUser!.id,
      targetId: log.targetId,
      details: `Redid ${log.action} from audit log ${log.id}`,
      timestamp: Date.now()
    });
    await saveAuditLogs(allLogs);
    await loadData();
  };

  const executeWithConfirm = (title: string, action: (reason: string) => Promise<void>, requireReason = true) => {
    setConfirmModal({
      isOpen: true,
      title,
      requireReason,
      action: async () => {
        await action(actionReason);
        setConfirmModal({ isOpen: false, title: '', action: async () => {}, requireReason: false });
        setActionReason('');
      }
    });
  };

  // Report actions
  const resolveReport = (report: Report, status: 'accepted' | 'rejected') => {
    executeWithConfirm(`Resolve Report as ${status.toUpperCase()}`, async (reason) => {
      const allReports = await getReports();
      const idx = allReports.findIndex(r => r.id === report.id);
      if (idx !== -1) {
        allReports[idx].status = status;
        allReports[idx].adminNotes = reason;
        await saveReports(allReports);
        setReports(allReports);
        
        if (status === 'accepted') {
          const vids = await getVideos();
          const vIdx = vids.findIndex(v => v.id === report.videoId);
          if (vIdx !== -1) {
             vids.splice(vIdx, 1);
             await saveVideos(vids);
             setVideos(vids);
          }
        }
        await logAction(`report_${status}`, report.id, `Report resolved. Notes: ${reason}`);
      }
    });
  };

  // User Ban actions
  const applyBan = (user: User, type: 'temp' | 'perm' | 'hwid', days?: number) => {
    const title = type === 'temp' ? `Temp Ban (7 days)` : type === 'perm' ? 'Permanent Ban' : 'Enforcement Ban';
    executeWithConfirm(title, async (reason) => {
      const allUsers = await getUsers();
      const idx = allUsers.findIndex(u => u.id === user.id);
      if (idx !== -1) {
        const until = type === 'temp' && days ? Date.now() + (days * 24 * 60 * 60 * 1000) : undefined;
        allUsers[idx].banStatus = {
          type,
          until,
          reason,
          linkedAccount: type === 'hwid' ? user.handle : undefined
        };
        if (type === 'hwid') allUsers[idx].deviceId = allUsers[idx].deviceId || getDeviceId();
        await saveUsers(allUsers);
        setUsers(allUsers);
        await logAction('ban_user', user.id, `Banned user (${type})${days ? ` for ${days} days` : ''}. Reason: ${reason}`);
      }
    });
  };

  // Appeal actions
  const resolveAppeal = (appeal: Appeal, status: 'accepted' | 'rejected') => {
    executeWithConfirm(`${status === 'accepted' ? 'Accept' : 'Reject'} Appeal`, async (reason) => {
      const allAppeals = await getAppeals();
      const idx = allAppeals.findIndex(a => a.id === appeal.id);
      if (idx !== -1) {
        allAppeals[idx].status = status;
        allAppeals[idx].adminNotes = reason;
        await saveAppeals(allAppeals);
        setAppeals(allAppeals);
        
        if (status === 'accepted') {
          const allUsers = await getUsers();
          const uIdx = allUsers.findIndex(u => u.id === appeal.userId);
          if (uIdx !== -1) {
            delete allUsers[uIdx].banStatus;
            await saveUsers(allUsers);
            setUsers(allUsers);
          }
        }
        await logAction(`appeal_${status}`, appeal.id, `Appeal ${status}. Notes: ${reason}`);
      }
    });
  };

  const filteredLogs = logs.filter(log => {
    if (!logSearch) return true;
    const searchLower = logSearch.toLowerCase();
    const admin = users.find(u => u.id === log.adminId);
    return log.action.toLowerCase().includes(searchLower) || 
           log.details.toLowerCase().includes(searchLower) ||
           (admin && admin.handle.toLowerCase().includes(searchLower));
  }).sort((a,b) => b.timestamp - a.timestamp);

  return (
    <div className="w-full h-full overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <ShieldAlert size={32} className={isOwner ? 'text-red-500' : 'text-blue-500'} />
          <h1 className="text-3xl font-bold">Moderation Dashboard</h1>
        </div>

        <div className="flex gap-2 mb-6 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto pb-2">
          {['reports', 'users', 'appeals', 'logs'].map(tab => (
            (tab !== 'logs' || isOwner) && (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-3 font-semibold rounded-t-lg transition-colors capitalize whitespace-nowrap ${
                  activeTab === tab ? 'bg-zinc-200 dark:bg-zinc-800 text-pink-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                {tab}
              </button>
            )
          ))}
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm min-h-[500px]">
          
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Pending Reports and Support</h2>
              {reports.filter(r => r.status === 'pending').map(report => {
                const vid = videos.find(v => v.id === report.videoId);
                const repUser = users.find(u => u.id === report.reporterId);
                return (
                  <div key={report.id} className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row gap-4">
                    {vid && (
                      <div className="w-24 h-32 bg-black shrink-0 rounded-lg overflow-hidden relative">
                         {vid.isYouTube ? (
                           <img src={`https://img.youtube.com/vi/${vid.youtubeId}/default.jpg`} className="w-full h-full object-cover opacity-50" />
                         ) : vid.videoUrl ? (
                           <video src={vid.videoUrl} className="w-full h-full object-cover" />
                         ) : null}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-red-500 mb-1">{report.category === 'support' ? 'Support Request' : report.category === 'bug' ? 'Bug / Issue' : 'Report'}: {report.reason}</p>
                      <p className="text-sm text-zinc-500 mb-2">Reported by: @{repUser?.handle}</p>
                      <p className="text-xs text-zinc-400 mb-4">{new Date(report.timestamp).toLocaleString()}</p>
                      <div className="flex gap-2">
                        <button onClick={() => resolveReport(report, 'accepted')} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm flex items-center gap-1">
                          <Trash2 size={16} /> Delete Video
                        </button>
                        <button onClick={() => resolveReport(report, 'rejected')} className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-semibold rounded-lg text-sm">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {reports.filter(r => r.status === 'pending').length === 0 && <p className="text-zinc-500">No pending reports.</p>}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4 overflow-x-auto">
              <h2 className="text-xl font-bold mb-4">User Management</h2>
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500">
                    <th className="pb-3 font-semibold">User</th>
                    <th className="pb-3 font-semibold">Role</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Join Date (ID)</th>
                    <th className="pb-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} className="w-10 h-10 rounded-full bg-zinc-800 object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-zinc-800" />
                          )}
                          <div>
                            <p className="font-bold">{u.username}</p>
                            <p className="text-xs text-zinc-500">@{u.handle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 capitalize text-sm font-medium">
                        {u.role || 'User'}
                      </td>
                      <td className="py-3 pr-4">
                        {u.banStatus ? (
                          <span className="text-red-500 text-xs uppercase bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded font-semibold whitespace-nowrap">
                            {u.banStatus.type} Ban
                          </span>
                        ) : (
                          <span className="text-green-500 text-xs uppercase bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded font-semibold">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-sm text-zinc-500 whitespace-nowrap">
                        {new Date(parseInt(u.id.split('_')[1] || '0')).toLocaleDateString() === 'Invalid Date' ? 'Unknown' : new Date(parseInt(u.id.split('_')[1])).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {!u.banStatus && u.role !== 'owner' && (
                            <>
                              <button onClick={() => applyBan(u, 'temp', 7)} className="px-2 py-1 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 font-semibold rounded text-xs hover:bg-yellow-500/30">
                                7d Ban
                              </button>
                              <button onClick={() => applyBan(u, 'perm')} className="px-2 py-1 bg-red-500/20 text-red-600 dark:text-red-400 font-semibold rounded text-xs hover:bg-red-500/30">
                                Permaban
                              </button>
                              <button onClick={() => applyBan(u, 'hwid')} className="px-2 py-1 bg-purple-500/20 text-purple-600 dark:text-purple-400 font-semibold rounded text-xs hover:bg-purple-500/30 flex items-center gap-1">
                                <Ban size={12} /> Enforcement
                              </button>
                              
                              {isOwner && u.role !== 'staff' && (
                                <button 
                                  onClick={() => executeWithConfirm('Promote to Staff', async (reason) => {
                                    const allUsers = await getUsers();
                                    const idx = allUsers.findIndex(user => user.id === u.id);
                                    if (idx !== -1) {
                                      allUsers[idx].role = 'staff';
                                      await saveUsers(allUsers);
                                      setUsers(allUsers);
                                      await logAction('promote_staff', u.id, `Promoted to staff. Reason: ${reason}`);
                                    }
                                  }, false)}
                                  className="px-2 py-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold rounded text-xs hover:bg-blue-500/30"
                                >
                                  Make Staff
                                </button>
                              )}
                            </>
                          )}
                          {isOwner && u.role === 'staff' && (
                            <button
                              onClick={() => executeWithConfirm('Remove Staff Permissions', async (reason) => {
                                const allUsers = await getUsers();
                                const idx = allUsers.findIndex(user => user.id === u.id);
                                if (idx !== -1) {
                                  allUsers[idx].role = 'user';
                                  await saveUsers(allUsers);
                                  setUsers(allUsers);
                                  await logAction('remove_staff', u.id, `Removed staff permissions. Reason: ${reason}`);
                                }
                              })}
                              className="px-2 py-1 bg-orange-500/20 text-orange-600 dark:text-orange-400 font-semibold rounded text-xs hover:bg-orange-500/30"
                            >
                              Remove Staff
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'appeals' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Ban Appeals</h2>
              {appeals.filter(a => a.status === 'pending').map(appeal => {
                const u = users.find(u => u.id === appeal.userId);
                return (
                  <div key={appeal.id} className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                    <p className="font-bold mb-1">@{u?.handle} <span className="font-normal text-zinc-500 text-sm">({u?.banStatus?.type} ban)</span></p>
                    <div className="bg-zinc-100 dark:bg-zinc-950 p-4 rounded-lg text-sm mb-4">
                      "{appeal.reason}"
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => resolveAppeal(appeal, 'accepted')} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm flex items-center gap-1">
                        <CheckCircle size={16} /> Accept Appeal
                      </button>
                      <button onClick={() => resolveAppeal(appeal, 'rejected')} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm flex items-center gap-1">
                        <XCircle size={16} /> Reject Appeal
                      </button>
                    </div>
                  </div>
                );
              })}
              {appeals.filter(a => a.status === 'pending').length === 0 && <p className="text-zinc-500">No pending appeals.</p>}
            </div>
          )}

          {activeTab === 'logs' && isOwner && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <h2 className="text-xl font-bold">Audit Logs</h2>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input 
                    type="text" 
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Search logs..." 
                    className="pl-10 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none focus:border-pink-500 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                {filteredLogs.map(log => {
                  const admin = users.find(u => u.id === log.adminId);
                  return (
                    <div key={log.id} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-sm flex flex-col sm:flex-row sm:gap-4 sm:items-center">
                      <div className="text-zinc-500 w-full sm:w-32 shrink-0">{new Date(log.timestamp).toLocaleString()}</div>
                      <div className="font-semibold w-full sm:w-32 truncate">@{admin?.handle || 'unknown'}</div>
                      <div className="font-mono text-xs bg-zinc-100 dark:bg-zinc-950 px-2 py-1 rounded w-max sm:w-32 my-2 sm:my-0">{log.action}</div>
                      <div className="flex-1">{log.details}</div>
                      <button
                        onClick={() => executeWithConfirm('Redo Audit Action', async () => redoAuditAction(log), false)}
                        className="p-2 text-zinc-500 hover:text-pink-600"
                        title="Redo action"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </div>
                  );
                })}
                {filteredLogs.length === 0 && <p className="text-zinc-500">No audit logs available.</p>}
              </div>
            </div>
          )}

        </div>
      </div>
      
      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xl font-bold mb-4">{confirmModal.title}</h3>
            {confirmModal.requireReason ? (
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Reason for Action (Required)</label>
                <textarea 
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 border border-transparent focus:border-pink-500 focus:outline-none resize-none min-h-[100px]"
                  placeholder="Provide a detailed reason for the audit log..."
                />
              </div>
            ) : (
              <p className="text-zinc-500 mb-6">Are you sure you want to perform this action?</p>
            )}
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal({ isOpen: false, title: '', action: async () => {}, requireReason: false })}
                className="flex-1 py-3 font-semibold bg-zinc-200 dark:bg-zinc-800 rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.action}
                disabled={confirmModal.requireReason && !actionReason.trim()}
                className="flex-1 py-3 font-semibold bg-pink-600 text-white rounded-xl disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
