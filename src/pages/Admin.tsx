import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { getUsers, getReports, saveReports, getAppeals, saveAppeals, getAuditLogs, saveAuditLogs, saveUsers, getVideos, saveVideos, getAppSettings, saveAppSettings, saveNotifications, getNotifications, getAnnouncements, saveAnnouncement, deleteAnnouncement, subscribeToAnnouncements } from '../lib/db';
import { User, Report, Appeal, AuditLog, Video, AppNotification, Announcement } from '../types';
import { ShieldAlert, AlertTriangle, Users, FileText, CheckCircle, XCircle, Trash2, Ban, Search, Filter, RotateCcw, Loader2, Power, Gamepad2, Settings, Megaphone, Plus, Calendar, Palette, Maximize, Target, Layout as LayoutIcon, Ghost } from 'lucide-react';
import { getDeviceId } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { GAMES, APPS } from '../data/games';

export function Admin() {
  const { currentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'appeals' | 'logs' | 'announcements' | 'settings'>('reports');
  
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Announcement Form State
  const [newAnnouncement, setNewAnnouncement] = useState<Partial<Announcement>>({
    text: '',
    type: 'global',
    color: 'bg-pink-600',
    size: 'md',
    active: true,
    targetGameIds: [],
    targetPage: '',
  });
  const [announcementDuration, setAnnouncementDuration] = useState('24h');

  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [appSettings, setAppSettings] = useState<{ 
    useCache: boolean; 
    youtubeApiKeyIndex: number; 
    serverCrashed: boolean; 
    gamesAppsCrashed: boolean; 
  }>({ 
    useCache: true, 
    youtubeApiKeyIndex: 0, 
    serverCrashed: false, 
    gamesAppsCrashed: false 
  });
  
  const [logSearch, setLogSearch] = useState('');

  // Pin & Countdown State
  const [pinModal, setPinModal] = useState<{ isOpen: boolean; action: () => void; title: string }>({ isOpen: false, action: () => {}, title: '' });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    action: (reason: string) => Promise<void>;
    requireReason: boolean;
    reasonLabel?: string;
    reasonPlaceholder?: string;
    loading?: boolean;
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
    setAnnouncements(await getAnnouncements());
    if (isOwner) {
      const settings = await getAppSettings();
      setAppSettings(settings);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.text) return;
    
    setConfirmModal(prev => ({ ...prev, loading: true }));
    try {
      const durationMs = announcementDuration === '1h' ? 60 * 60 * 1000 :
                         announcementDuration === '24h' ? 24 * 60 * 60 * 1000 :
                         announcementDuration === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                         announcementDuration === '30d' ? 30 * 24 * 60 * 60 * 1000 : 0;
      
      const announcement: Announcement = {
        id: `ann_${Date.now()}`,
        text: newAnnouncement.text!,
        type: newAnnouncement.type as any,
        targetPage: newAnnouncement.targetPage,
        targetGameIds: newAnnouncement.targetGameIds,
        color: newAnnouncement.color!,
        size: newAnnouncement.size as any,
        createdAt: Date.now(),
        expiresAt: durationMs > 0 ? Date.now() + durationMs : undefined,
        active: true
      };

      await saveAnnouncement(announcement);
      // Local update is redundant if subscription is active but good for responsiveness
      setAnnouncements(prev => [announcement, ...prev]);
      setNewAnnouncement({
        text: '',
        type: 'global',
        color: 'bg-pink-600',
        size: 'md',
        active: true,
        targetGameIds: []
      });
      await logAction('create_announcement', announcement.id, `Created ${announcement.type} announcement: ${announcement.text.substring(0, 30)}...`);
    } catch (err) {
      console.error(err);
      alert("Failed to create announcement. Please check permissions (Try logging in with Google).");
    } finally {
      setConfirmModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    await deleteAnnouncement(id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    await logAction('delete_announcement', id, `Deleted announcement`);
  };

  useEffect(() => {
    if (isMod) {
      loadData();
      const unsub = subscribeToAnnouncements(setAnnouncements);
      return () => unsub();
    }
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

  const executeWithConfirm = (
    title: string, 
    action: (reason: string) => Promise<void>, 
    requireReason = true,
    reasonLabel?: string,
    reasonPlaceholder?: string
  ) => {
    setActionReason('');
    setConfirmModal({
      isOpen: true,
      title,
      requireReason,
      reasonLabel,
      reasonPlaceholder,
      action
    });
  };

  const handleConfirmAction = async () => {
    if (confirmModal.requireReason && !actionReason.trim()) return;
    setConfirmModal(prev => ({ ...prev, loading: true }));
    try {
      await confirmModal.action(actionReason.trim());
      setConfirmModal({ isOpen: false, title: '', action: async () => {}, requireReason: false, loading: false });
      setActionReason('');
    } catch (err) {
      console.error(err);
      setConfirmModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Report actions
  const handleResolveReport = (report: Report, status: 'accepted' | 'rejected') => {
    executeWithConfirm(`Resolve Report as ${status.toUpperCase()}`, async (reason) => {
      // Use the centralized resolveReport helper
      const { resolveReport: dbResolveReport } = await import('../lib/db');
      
      if (status === 'accepted') {
        const allReports = await getReports();
        const idx = allReports.findIndex(r => r.id === report.id);
        if (idx !== -1) {
          // If accepted, we still need to handle video removal and tradient rewards logic here
          // as it's specific to the admin UI flow
          const vids = await getVideos();
          const vIdx = vids.findIndex(v => v.id === report.videoId);
          if (vIdx !== -1) {
             vids[vIdx].isRemoved = true;
             vids[vIdx].removalReason = reason;
             await saveVideos(vids);
             setVideos(vids);
          }

          const allUsers = await getUsers();
          const reporterIdx = allUsers.findIndex(u => u.id === report.reporterId);
          if (reporterIdx !== -1) {
            const reporter = allUsers[reporterIdx];
            reporter.acceptedReportsCount = (reporter.acceptedReportsCount || 0) + 1;
            if (reporter.acceptedReportsCount === 3 && !(reporter.badges || []).includes('Tradient')) {
              reporter.badges = [...(reporter.badges || []), 'Tradient'];
            }
            await saveUsers(allUsers);
            setUsers(allUsers);
          }
        }
      }

      // This helper updates the status and sends the notification to the reporter
      await dbResolveReport(report.id, currentUser!.id, currentUser!.username, reason);
      
      // Update local state
      const updatedReports = await getReports();
      setReports(updatedReports);
      
      await logAction(`report_${status}`, report.id, `Report resolved. Notes: ${reason}`);
    }, true, 'Moderator Note / Reason', 'State why this report is resolved...');
  };

  // User Ban actions
  const applyBan = (user: User, type: 'temp' | 'perm' | 'hwid', days?: number) => {
    const title = type === 'temp' 
      ? `Temp Ban (7 days): @${user.handle}` 
      : type === 'perm' 
      ? `Permanent Ban: @${user.handle}` 
      : `Enforcement (Hardware) Ban: @${user.handle}`;
    
    executeWithConfirm(
      title, 
      async (reason) => {
        const allUsers = await getUsers();
        const idx = allUsers.findIndex(u => u.id === user.id);
        if (idx !== -1) {
          const until = type === 'temp' && days ? Date.now() + (days * 24 * 60 * 60 * 1000) : undefined;
          allUsers[idx].banStatus = {
            type,
            until,
            reason: reason.trim(),
            bannedBy: currentUser!.id,
            bannedAt: Date.now(),
            linkedAccount: type === 'hwid' ? user.handle : undefined
          };
          if (type === 'hwid') allUsers[idx].deviceId = allUsers[idx].deviceId || getDeviceId();
          await saveUsers(allUsers);
          setUsers(allUsers);
          await logAction('ban_user', user.id, `Banned user (${type})${days ? ` for ${days} days` : ''}. Reason: ${reason}`);
        }
      },
      true,
      'Reason for Ban (Mandatory for staff/owner)',
      'Specify the guideline violation or reason why this user is being banned...'
    );
  };

  // User Unban action
  const unbanUser = (user: User) => {
    executeWithConfirm(
      `Unban User: @${user.handle}`,
      async (reason) => {
        const allUsers = await getUsers();
        const idx = allUsers.findIndex(u => u.id === user.id);
        if (idx !== -1) {
          delete allUsers[idx].banStatus;
          await saveUsers(allUsers);
          setUsers(allUsers);
          await logAction('unban_user', user.id, `Unbanned user @${user.handle}. Reason: ${reason}`);
        }
      },
      true,
      'Reason for Unbanning (Mandatory)',
      'Explain why this person is getting unbanned...'
    );
  };

  // Appeal actions
  const resolveAppeal = (appeal: Appeal, status: 'accepted' | 'rejected') => {
    const u = users.find(user => user.id === appeal.userId);
    const title = status === 'accepted' ? `Accept Appeal & Unban @${u?.handle || 'User'}` : `Reject Appeal - Keep @${u?.handle || 'User'} Banned`;
    const label = status === 'accepted' 
      ? 'Reason for Unbanning (Mandatory - why they are getting unbanned)' 
      : 'Reason Why Still Banned (Mandatory - why they remain banned)';
    const placeholder = status === 'accepted'
      ? 'Provide detailed reason why this user is getting unbanned...'
      : 'Explain why this appeal was rejected and why the user is still banned...';

    executeWithConfirm(
      title, 
      async (reason) => {
        const allAppeals = await getAppeals();
        const idx = allAppeals.findIndex(a => a.id === appeal.id);
        if (idx !== -1) {
          allAppeals[idx].status = status;
          allAppeals[idx].adminNotes = reason;
          await saveAppeals(allAppeals);
          setAppeals(allAppeals);
          
          if (appeal.videoId) {
            // Video appeal
            if (status === 'accepted') {
              const allVids = await getVideos();
              const vIdx = allVids.findIndex(v => v.id === appeal.videoId);
              if (vIdx !== -1) {
                delete allVids[vIdx].isRemoved;
                delete allVids[vIdx].removalReason;
                await saveVideos(allVids);
                setVideos(allVids);
              }
            }
          } else {
            // Ban appeal
            const allUsers = await getUsers();
            const uIdx = allUsers.findIndex(user => user.id === appeal.userId);
            if (uIdx !== -1) {
              if (status === 'accepted') {
                delete allUsers[uIdx].banStatus;
              } else {
                if (allUsers[uIdx].banStatus) {
                  allUsers[uIdx].banStatus!.stillBannedReason = reason;
                }
              }
              await saveUsers(allUsers);
              setUsers(allUsers);
            }
          }
          await logAction(`appeal_${status}`, appeal.id, `Appeal ${status}. Reason/Notes: ${reason}`);
        }
      },
      true,
      label,
      placeholder
    );
  };

  const toggleCache = async () => {
    if (!isOwner) return;
    const newSettings = { ...appSettings, useCache: !appSettings.useCache };
    setAppSettings(newSettings);
    await saveAppSettings(newSettings);
    await logAction('toggle_cache', 'system', `Toggled cached data to ${newSettings.useCache ? 'ON' : 'OFF'}`);
  };

  const updateApiIndex = async (index: number) => {
    if (!isOwner) return;
    const newSettings = { ...appSettings, youtubeApiKeyIndex: index };
    setAppSettings(newSettings);
    await saveAppSettings(newSettings);
    await logAction('update_api_index', 'system', `Updated YouTube API strategy to ${index === 0 ? 'Automatic' : `Key ${index}`}`);
  };

  const handleCrashAction = (type: 'server' | 'games', currentStatus: boolean) => {
    if (!isOwner) return;
    setPinInput('');
    setPinError(false);
    setPinModal({
      isOpen: true,
      title: currentStatus ? `Recover ${type === 'server' ? 'Server' : 'Games & Apps'}` : `Shutdown ${type === 'server' ? 'Server' : 'Games & Apps'}`,
      action: async () => {
        if (currentStatus) {
           // Direct recovery
           const newSettings = type === 'server' 
             ? { ...appSettings, serverCrashed: false } 
             : { ...appSettings, gamesAppsCrashed: false };
           setAppSettings(newSettings);
           await saveAppSettings(newSettings);
           await logAction(`${type}_recover`, 'system', `Recovered ${type}`);
        } else {
           // Start countdown
           setCountdown(10);
        }
      }
    });
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const executeCrash = async () => {
        const type = pinModal.title.includes('Server') ? 'server' : 'games';
        const newSettings = type === 'server' 
          ? { ...appSettings, serverCrashed: true } 
          : { ...appSettings, gamesAppsCrashed: true };
        setAppSettings(newSettings);
        await saveAppSettings(newSettings);
        await logAction(`${type}_crash`, 'system', `Crashed ${type} intentionally`);
        setTimeout(() => setCountdown(null), 3000);
      };
      executeCrash();
    }
  }, [countdown]);

  const verifyPin = () => {
    if (pinInput === '1205') {
      setPinModal(prev => ({ ...prev, isOpen: false }));
      pinModal.action();
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 2000);
    }
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
          {['reports', 'users', 'appeals', 'logs', 'announcements', 'settings'].map(tab => (
            ((tab !== 'logs' && tab !== 'announcements' && tab !== 'settings') || isOwner) && (
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
                const vid = report.videoId ? videos.find(v => v.id === report.videoId) : null;
                const repUser = users.find(u => u.id === report.reporterId);
                return (
                  <div key={report.id} className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row gap-4">
                    {vid ? (
                      <div className="w-24 h-32 bg-black shrink-0 rounded-lg overflow-hidden relative">
                         {vid.isYouTube ? (
                           <img src={`https://img.youtube.com/vi/${vid.youtubeId}/default.jpg`} className="w-full h-full object-cover opacity-50" />
                         ) : vid.videoUrl ? (
                           <video src={vid.videoUrl} className="w-full h-full object-cover" />
                         ) : null}
                      </div>
                    ) : (
                      <div className="w-24 h-32 bg-zinc-100 dark:bg-zinc-800 shrink-0 rounded-lg flex items-center justify-center text-zinc-400">
                        <AlertTriangle size={32} />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-red-500 mb-1">{report.category === 'support' ? 'Support Request' : report.category === 'bug' ? 'Bug / Issue' : 'Report'}: {report.reason}</p>
                      <p className="text-sm text-zinc-500 mb-2">Reported by: @{repUser?.handle}</p>
                      <p className="text-xs text-zinc-400 mb-4">{new Date(report.timestamp).toLocaleString()}</p>
                      <div className="flex gap-2">
                        {vid && (
                          <button onClick={() => setPreviewVideo(vid)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm flex items-center gap-1">
                            <Search size={16} /> View Video
                          </button>
                        )}
                        <button onClick={() => handleResolveReport(report, 'accepted')} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm flex items-center gap-1">
                          {report.category === 'video' ? <Trash2 size={16} /> : <CheckCircle size={16} />}
                          {report.category === 'video' ? 'Take Down' : 'Resolve'}
                        </button>
                        <button onClick={() => handleResolveReport(report, 'rejected')} className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-semibold rounded-lg text-sm">
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
                          <div>
                            <span className="text-red-500 text-xs uppercase bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded font-semibold whitespace-nowrap">
                              {u.banStatus.type} Ban
                            </span>
                            {u.banStatus.reason && (
                              <p className="text-[11px] text-zinc-400 mt-1 max-w-[200px] truncate" title={u.banStatus.reason}>
                                Reason: {u.banStatus.reason}
                              </p>
                            )}
                          </div>
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
                        <div className="flex flex-wrap gap-2 items-center">
                          {u.banStatus && (
                            <button 
                              onClick={() => unbanUser(u)} 
                              className="px-2.5 py-1 bg-green-500/20 text-green-600 dark:text-green-400 font-semibold rounded text-xs hover:bg-green-500/30 flex items-center gap-1"
                              title="Unban this user"
                            >
                              <CheckCircle size={13} /> Unban User
                            </button>
                          )}
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
              <h2 className="text-xl font-bold mb-4">Pending Appeals</h2>
              {appeals.filter(a => a.status === 'pending').map(appeal => {
                const u = users.find(u => u.id === appeal.userId);
                const vid = appeal.videoId ? videos.find(v => v.id === appeal.videoId) : null;
                return (
                  <div key={appeal.id} className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold">@{u?.handle}</p>
                        <p className="text-xs text-zinc-500">{appeal.videoId ? 'Video Removal Appeal' : 'Ban Appeal'}</p>
                      </div>
                      {vid && (
                        <button onClick={() => setPreviewVideo(vid)} className="text-pink-600 text-xs font-bold hover:underline">
                          View Removed Video
                        </button>
                      )}
                    </div>
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

          {activeTab === 'announcements' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Megaphone className="text-pink-600" /> Create Announcement
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Creation Form */}
                  <div className="space-y-4 bg-zinc-50 dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Announcement Text</label>
                      <textarea
                        value={newAnnouncement.text}
                        onChange={e => setNewAnnouncement(prev => ({ ...prev, text: e.target.value }))}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 outline-none focus:border-pink-500 min-h-[100px] resize-none"
                        placeholder="Type your announcement here..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">Target Type</label>
                        <select
                          value={newAnnouncement.type}
                          onChange={e => setNewAnnouncement(prev => ({ ...prev, type: e.target.value as any }))}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 outline-none focus:border-pink-500"
                        >
                          <option value="global">Global (All Pages)</option>
                          <option value="page">Specific Page</option>
                          <option value="game">Specific Games</option>
                        </select>
                      </div>

                      {newAnnouncement.type === 'page' && (
                        <div>
                          <label className="block text-sm font-semibold mb-2">Target Page</label>
                          <select
                            value={newAnnouncement.targetPage}
                            onChange={e => setNewAnnouncement(prev => ({ ...prev, targetPage: e.target.value }))}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 outline-none focus:border-pink-500"
                          >
                            <option value="">Select Page</option>
                            <option value="/home">Home / Feed</option>
                            <option value="/explore">Explore</option>
                            <option value="/inbox">Inbox</option>
                            <option value="/games">Games & Apps</option>
                            <option value="/profile">Profile</option>
                          </select>
                        </div>
                      )}

                      {newAnnouncement.type === 'game' && (
                        <div className="col-span-2">
                          <label className="block text-sm font-semibold mb-2">Target Games & Apps</label>
                          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 max-h-[200px] overflow-y-auto">
                            <div className="flex flex-wrap gap-2">
                              {[...GAMES, ...APPS].map(item => (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    const ids = newAnnouncement.targetGameIds || [];
                                    if (ids.includes(item.title)) {
                                      setNewAnnouncement(prev => ({ ...prev, targetGameIds: ids.filter(id => id !== item.title) }));
                                    } else {
                                      setNewAnnouncement(prev => ({ ...prev, targetGameIds: [...ids, item.title] }));
                                    }
                                  }}
                                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                                    (newAnnouncement.targetGameIds || []).includes(item.title)
                                      ? 'bg-pink-600 text-white'
                                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-300'
                                  }`}
                                >
                                  {item.title}
                                </button>
                              ))}
                            </div>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-2 italic">Click titles to toggle selection. Announcements will show when these games are active.</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2 flex items-center gap-1">
                          <Palette size={14} /> Color
                        </label>
                        <select
                          value={newAnnouncement.color}
                          onChange={e => setNewAnnouncement(prev => ({ ...prev, color: e.target.value }))}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 outline-none focus:border-pink-500"
                        >
                          <option value="bg-pink-600">Pink</option>
                          <option value="bg-blue-600">Blue</option>
                          <option value="bg-green-600">Green</option>
                          <option value="bg-orange-500">Orange</option>
                          <option value="bg-red-600">Red</option>
                          <option value="bg-zinc-900">Black</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2 flex items-center gap-1">
                          <Maximize size={14} /> Size
                        </label>
                        <select
                          value={newAnnouncement.size}
                          onChange={e => setNewAnnouncement(prev => ({ ...prev, size: e.target.value as any }))}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 outline-none focus:border-pink-500"
                        >
                          <option value="sm">Small</option>
                          <option value="md">Medium</option>
                          <option value="lg">Large</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2 flex items-center gap-1">
                          <Calendar size={14} /> Duration
                        </label>
                        <select
                          value={announcementDuration}
                          onChange={e => setAnnouncementDuration(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 outline-none focus:border-pink-500"
                        >
                          <option value="1h">1 Hour</option>
                          <option value="24h">24 Hours</option>
                          <option value="7d">7 Days</option>
                          <option value="30d">30 Days</option>
                          <option value="never">Permanent</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleCreateAnnouncement}
                      className="w-full py-4 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-lg shadow-pink-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={20} /> Launch Announcement
                    </button>
                  </div>

                  {/* Preview Section */}
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold mb-2 text-zinc-500 uppercase tracking-widest">Live Preview</label>
                    <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex items-center justify-center min-h-[200px] bg-zinc-50/50 dark:bg-zinc-950/50">
                      {newAnnouncement.text ? (
                        <div className={`relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden border flex items-center gap-4 animate-pulse
                          ${newAnnouncement.size === 'sm' ? 'p-3 text-sm' : newAnnouncement.size === 'md' ? 'p-4 text-base' : 'p-6 text-lg'}
                          ${newAnnouncement.color} text-white border-white/20
                        `}>
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                            <Megaphone size={20} />
                          </div>
                          <div className="flex-grow font-bold tracking-tight leading-snug">
                            {newAnnouncement.text}
                          </div>
                        </div>
                      ) : (
                        <div className="text-zinc-400 flex flex-col items-center gap-2">
                          <Ghost size={40} className="opacity-20" />
                          <p className="text-sm">Enter text to see preview</p>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl">
                      <div className="flex gap-3 text-blue-600 dark:text-blue-400">
                        <Target size={20} className="shrink-0" />
                        <div className="text-sm">
                          <p className="font-bold">Targeting Summary</p>
                          <p className="opacity-80">
                            This announcement will be shown {newAnnouncement.type === 'global' ? 'everywhere in the app' : 
                                                            newAnnouncement.type === 'page' ? `on the ${newAnnouncement.targetPage} page` : 
                                                            `to players of: ${(newAnnouncement.targetGameIds || []).join(', ') || 'No games selected'}`}.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                   Active & Recent Announcements ({announcements.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {announcements.map(ann => (
                    <div key={ann.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex items-start gap-4 shadow-sm group">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ann.color} text-white`}>
                        <Megaphone size={20} />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            ann.type === 'global' ? 'bg-purple-100 text-purple-600' :
                            ann.type === 'page' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                          }`}>
                            {ann.type}
                          </span>
                          {!ann.active && <span className="text-[10px] font-black uppercase bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded">Inactive</span>}
                        </div>
                        <p className="font-bold text-sm mb-2 line-clamp-2">{ann.text}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400">
                            {ann.expiresAt ? `Expires: ${new Date(ann.expiresAt).toLocaleDateString()}` : 'Never Expires'}
                          </span>
                          <button 
                            onClick={() => handleDeleteAnnouncement(ann.id)}
                            className="p-2 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {announcements.length === 0 && (
                    <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                      No active announcements found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && isOwner && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold mb-2">Global App Settings</h2>
                <p className="text-zinc-500 text-sm mb-6">Manage high-level system behaviors. These changes affect all users instantly.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* YouTube Cache */}
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg">YouTube Data Caching</h3>
                        <p className="text-xs text-zinc-500 mt-1">
                          Prefer pre-fetched feed to save quota.
                        </p>
                      </div>
                      <button 
                        onClick={toggleCache}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${
                          appSettings.useCache ? 'bg-pink-600' : 'bg-zinc-300 dark:bg-zinc-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            appSettings.useCache ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                      appSettings.useCache ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'
                    }`}>
                      Status: {appSettings.useCache ? 'ON' : 'OFF'}
                    </span>
                  </div>

                  {/* API Strategy */}
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-bold text-lg mb-2">YouTube API Strategy</h3>
                    <p className="text-xs text-zinc-500 mb-4">Choose a specific key or use automatic rotation.</p>
                    <select 
                      value={appSettings.youtubeApiKeyIndex}
                      onChange={(e) => updateApiIndex(parseInt(e.target.value))}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2 rounded-lg outline-none focus:border-pink-500"
                    >
                      <option value={0}>Automatic (Rotation)</option>
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(idx => (
                        <option key={idx} value={idx}>YOUTUBE API KEY {idx}</option>
                      ))}
                    </select>
                  </div>

                  {/* Crash Buttons */}
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-2">
                         <Power className={appSettings.serverCrashed ? 'text-red-500' : 'text-green-500'} />
                         <h3 className="font-bold">System Server</h3>
                       </div>
                       <button 
                         onClick={() => handleCrashAction('server', appSettings.serverCrashed)}
                         className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-tighter transition-all ${
                           appSettings.serverCrashed 
                             ? 'bg-green-600 text-white hover:bg-green-700' 
                             : 'bg-red-600 text-white hover:bg-red-700'
                         }`}
                       >
                         {appSettings.serverCrashed ? 'Recover Server' : 'Self Crash'}
                       </button>
                    </div>
                    <p className="text-xs text-zinc-500">Crashes the entire video feed system for all users.</p>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-2">
                         <Gamepad2 className={appSettings.gamesAppsCrashed ? 'text-red-500' : 'text-green-500'} />
                         <h3 className="font-bold">Games & Apps</h3>
                       </div>
                       <button 
                         onClick={() => handleCrashAction('games', appSettings.gamesAppsCrashed)}
                         className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-tighter transition-all ${
                           appSettings.gamesAppsCrashed 
                             ? 'bg-green-600 text-white hover:bg-green-700' 
                             : 'bg-red-600 text-white hover:bg-red-700'
                         }`}
                       >
                         {appSettings.gamesAppsCrashed ? 'Enable' : 'Shutdown'}
                       </button>
                    </div>
                    <p className="text-xs text-zinc-500">Disables access to the Games & Apps section.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Video Preview Modal */}
      <AnimatePresence>
        {previewVideo && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black rounded-3xl w-full max-w-sm aspect-[9/16] relative overflow-hidden shadow-2xl border border-zinc-800"
            >
              <button 
                onClick={() => setPreviewVideo(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
              >
                <XCircle size={24} />
              </button>
              
              {previewVideo.isYouTube ? (
                <iframe 
                  src={`https://www.youtube.com/embed/${previewVideo.youtubeId}?autoplay=1&mute=0`}
                  className="w-full h-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video 
                  src={previewVideo.videoUrl} 
                  controls 
                  autoPlay 
                  className="w-full h-full object-cover"
                />
              )}
              
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white font-bold">{previewVideo.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {previewVideo.tags.map(t => (
                    <span key={t} className="text-pink-400 text-xs">#{t}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PIN Modal */}
      {pinModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-sm p-8 shadow-2xl border border-zinc-800 text-center"
          >
            <Settings className="w-12 h-12 mx-auto mb-4 text-pink-600" />
            <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter">{pinModal.title}</h3>
            <p className="text-zinc-500 text-sm mb-6">Enter Owner PIN to proceed</p>
            
            <div className="space-y-4">
              <input 
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                className={`w-full bg-zinc-100 dark:bg-zinc-950 border-2 ${pinError ? 'border-red-500' : 'border-zinc-800'} rounded-2xl py-4 text-center text-3xl font-black tracking-[1em] outline-none transition-all`}
                autoFocus
              />
              {pinError && <p className="text-red-500 text-xs font-bold uppercase animate-bounce">Invalid PIN</p>}
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setPinModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-4 font-black bg-zinc-200 dark:bg-zinc-800 rounded-2xl uppercase text-xs"
                >
                  Cancel
                </button>
                <button 
                  onClick={verifyPin}
                  className="flex-1 py-4 font-black bg-pink-600 text-white rounded-2xl uppercase text-xs shadow-lg shadow-pink-600/30"
                >
                  Verify
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Crash Animation Overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-white"
          >
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-[12rem] font-black leading-none"
            >
              {countdown}
            </motion.div>
            <p className="text-xl font-bold uppercase tracking-[0.5em] mt-8 text-red-500">Executing Payload</p>
            {countdown === 0 && (
               <motion.div 
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 className="mt-8 text-2xl font-black text-red-600 uppercase"
               >
                 {pinModal.title.includes('Server') ? 'Servers has crashed' : 'Games & Apps has crashed'}
               </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xl font-bold mb-4">{confirmModal.title}</h3>
            {confirmModal.requireReason ? (
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">
                  {confirmModal.reasonLabel || 'Reason for Action (Required)'}
                </label>
                <textarea 
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 border border-transparent focus:border-pink-500 focus:outline-none resize-none min-h-[100px]"
                  placeholder={confirmModal.reasonPlaceholder || 'Provide a detailed reason for this action...'}
                />
              </div>
            ) : (
              <p className="text-zinc-500 mb-6">Are you sure you want to perform this action?</p>
            )}
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setConfirmModal({ isOpen: false, title: '', action: async () => {}, requireReason: false });
                  setActionReason('');
                }}
                disabled={confirmModal.loading}
                className="flex-1 py-3 font-semibold bg-zinc-200 dark:bg-zinc-800 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmAction}
                disabled={(confirmModal.requireReason && !actionReason.trim()) || confirmModal.loading}
                className="flex-1 py-3 font-semibold bg-pink-600 text-white rounded-xl disabled:opacity-50 hover:bg-pink-700 transition-colors flex items-center justify-center gap-2"
              >
                {confirmModal.loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Processing...
                  </>
                ) : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
