'use client';

import { useState, useEffect } from 'react';
import { api, User } from '../lib/api';
import { 
  Key, 
  Lock, 
  User as UserIcon, 
  RefreshCw, 
  LogOut, 
  Copy, 
  Check, 
  Shield, 
  Database,
  CheckCircle2,
  AlertCircle,
  Activity,
  UserCheck
} from 'lucide-react';

interface AuditLog {
  timestamp: string;
  action: string;
  status: 'SUCCESS' | 'ERROR';
  details?: string;
}

export default function DeveloperDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [apiConnected, setApiConnected] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);

  const [loginEmail, setLoginEmail] = useState('admin@test.com');
  const [loginPassword, setLoginPassword] = useState('AdminPassword@1234');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [copiedAccess, setCopiedAccess] = useState(false);
  const [copiedRefresh, setCopiedRefresh] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [userList, setUserList] = useState<User[]>([]);
  const [userListError, setUserListError] = useState<string | null>(null);

  const logAction = (action: string, status: 'SUCCESS' | 'ERROR', details?: string) => {
    const newLog: AuditLog = {
      timestamp: new Date().toLocaleTimeString(),
      action,
      status,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = api.user;
      if (storedUser) {
        setUser(storedUser);
        logAction('RESTORE_SESSION', 'SUCCESS', `Session restored for ${storedUser.email}`);
        if (storedUser.role === 'ADMIN') {
          fetchUsers();
        }
      } else {
        logAction('INIT_GUEST', 'SUCCESS', 'No active session found. Running as Guest.');
      }
      setAuthInitialized(true);
    }
  }, []);

  const fetchUsers = async () => {
    try {
      setUserListError(null);
      const res = await api.getAdminUsers();
      setUserList(res.users);
      logAction('FETCH_USERS_DATABASE', 'SUCCESS', `Successfully fetched ${res.total} users.`);
      setApiConnected(true);
    } catch (err: any) {
      setUserListError(err.message || 'Failed to fetch users');
      logAction('FETCH_USERS_DATABASE', 'ERROR', err.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);
    try {
      logAction('LOGIN_ATTEMPT', 'SUCCESS', `Initiating authentication request for ${loginEmail}`);
      const data = await api.login(loginEmail, loginPassword);
      setUser(data.user);
      logAction('LOGIN_SUCCESS', 'SUCCESS', `Authenticated as ${data.user.role}: ${data.user.email}`);
      setApiConnected(true);
      if (data.user.role === 'ADMIN') {
        fetchUsers();
      } else {
        setUserList([]);
      }
    } catch (err: any) {
      setFormError(err.message);
      logAction('LOGIN_FAILED', 'ERROR', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);
    try {
      logAction('REGISTER_ATTEMPT', 'SUCCESS', `Creating user account for ${registerEmail}`);
      const data = await api.register(registerName, registerEmail, registerPassword);
      logAction('REGISTER_SUCCESS', 'SUCCESS', `Created account for ${registerEmail}`);
      
      logAction('LOGIN_ATTEMPT', 'SUCCESS', `Auto-logging in user ${registerEmail}`);
      const loginData = await api.login(registerEmail, registerPassword);
      setUser(loginData.user);
      logAction('LOGIN_SUCCESS', 'SUCCESS', `Authenticated as ${loginData.user.role}`);
      
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
    } catch (err: any) {
      setFormError(err.message);
      logAction('REGISTER_FAILED', 'ERROR', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      logAction('LOGOUT_ATTEMPT', 'SUCCESS', 'Sending session revocation request');
      await api.logout();
      setUser(null);
      setUserList([]);
      logAction('LOGOUT_SUCCESS', 'SUCCESS', 'Tokens blacklisted and local storage cleared');
    } catch (err: any) {
      logAction('LOGOUT_ERROR', 'ERROR', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRotation = async () => {
    setIsLoading(true);
    try {
      logAction('TOKEN_ROTATION_ATTEMPT', 'SUCCESS', 'Triggering token rotation exchange');
      const refreshed = await api.rotateTokensManually();
      if (refreshed) {
        logAction('TOKEN_ROTATION_SUCCESS', 'SUCCESS', 'Successfully swapped tokens and rotated keys');
        const freshUser = await api.getMe();
        setUser(freshUser);
        if (freshUser.role === 'ADMIN') {
          fetchUsers();
        }
      } else {
        setUser(null);
        setUserList([]);
        logAction('TOKEN_ROTATION_FAILED', 'ERROR', 'Session invalid or refresh token expired');
      }
    } catch (err: any) {
      logAction('TOKEN_ROTATION_ERROR', 'ERROR', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const syncProfile = async () => {
    if (!user) return;
    try {
      logAction('SYNC_PROFILE_ATTEMPT', 'SUCCESS', 'Sending GET /users/me request');
      const freshUser = await api.getMe();
      setUser(freshUser);
      logAction('SYNC_PROFILE_SUCCESS', 'SUCCESS', `Profile synchronized: ${freshUser.name} (${freshUser.role})`);
    } catch (err: any) {
      logAction('SYNC_PROFILE_FAILED', 'ERROR', err.message);
    }
  };

  const copyToClipboard = (text: string | null, type: 'access' | 'refresh') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'access') {
      setCopiedAccess(true);
      setTimeout(() => setCopiedAccess(false), 2000);
    } else {
      setCopiedRefresh(true);
      setTimeout(() => setCopiedRefresh(false), 2000);
    }
    logAction('COPY_TOKEN', 'SUCCESS', `Copied ${type === 'access' ? 'Access' : 'Refresh'} Token to clipboard`);
  };

  const truncateToken = (token: string | null) => {
    if (!token) return 'null';
    return `${token.substring(0, 16)}...${token.substring(token.length - 12)}`;
  };

  if (!authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex items-center space-x-2">
          <RefreshCw className="animate-spin text-blue-600 h-5 w-5" />
          <span className="text-sm font-medium">Initializing developer environment...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">Auth Control Panel</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-full text-xs font-medium border border-slate-200">
              <span className={`h-2.5 w-2.5 rounded-full ${apiConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
              <span className="text-slate-600">{apiConnected ? 'API Connected' : 'API Connection Error'}</span>
            </div>
            {user && (
              <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-medium">
                <UserCheck className="h-3.5 w-3.5" />
                <span>{user.role}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-5 space-y-8">
            
            {user ? (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/70">
                  <h2 className="font-semibold text-slate-900 text-sm tracking-wide uppercase">Active Session Details</h2>
                  <p className="text-xs text-slate-500 mt-1">Inspecting secure claims stored in localStorage</p>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">User Identity</span>
                      <span className="text-sm font-semibold text-slate-800">{user.name}</span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Email Address</span>
                      <span className="text-sm text-slate-800 font-mono">{user.email}</span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Role Privilege</span>
                      <span className="inline-block mt-1 bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded text-xs font-mono">
                        {user.role}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Access Token (JWT)</span>
                        <button 
                          onClick={() => copyToClipboard(api.accessToken, 'access')}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                        >
                          {copiedAccess ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedAccess ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono text-slate-600 select-all break-all">
                        {truncateToken(api.accessToken)}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Refresh Token (JWT + Session Key)</span>
                        <button 
                          onClick={() => copyToClipboard(api.refreshToken, 'refresh')}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                        >
                          {copiedRefresh ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedRefresh ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono text-slate-600 select-all break-all">
                        {truncateToken(api.refreshToken)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100">
                    <button
                      onClick={handleManualRotation}
                      disabled={isLoading}
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm py-2 px-3 border border-slate-300 rounded-lg shadow-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>Rotate Tokens</span>
                    </button>
                    <button
                      onClick={syncProfile}
                      disabled={isLoading}
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm py-2 px-3 border border-slate-300 rounded-lg shadow-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                    >
                      <Activity className="h-4 w-4 text-slate-500" />
                      <span>Sync Profile</span>
                    </button>
                  </div>

                  <button
                    onClick={handleLogout}
                    disabled={isLoading}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium text-sm py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Revoke Access (Log Out)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-200">
                  <button
                    onClick={() => { setActiveTab('login'); setFormError(null); }}
                    className={`flex-1 py-3.5 text-center text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'login' 
                        ? 'border-blue-600 text-blue-600 bg-blue-50/20' 
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { setActiveTab('register'); setFormError(null); }}
                    className={`flex-1 py-3.5 text-center text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'register' 
                        ? 'border-blue-600 text-blue-600 bg-blue-50/20' 
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                <div className="p-6">
                  {formError && (
                    <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-lg flex items-start space-x-3 text-sm">
                      <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {activeTab === 'login' ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                      <p className="text-xs text-slate-500 mb-2">
                        System databases automatically seed the default admin account:
                      </p>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email Address</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UserIcon className="h-4 w-4 text-slate-400" />
                          </span>
                          <input
                            type="email"
                            required
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="admin@test.com"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Password</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-4 w-4 text-slate-400" />
                          </span>
                          <input
                            type="password"
                            required
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-4 rounded-lg shadow-sm flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 mt-6"
                      >
                        <Key className="h-4 w-4" />
                        <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Full Name</label>
                        <input
                          type="text"
                          required
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Jane Doe"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email Address</label>
                        <input
                          type="email"
                          required
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="jane@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Password</label>
                        <input
                          type="password"
                          required
                          minLength={8}
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="At least 8 characters"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-4 rounded-lg shadow-sm flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 mt-6"
                      >
                        <UserIcon className="h-4 w-4" />
                        <span>{isLoading ? 'Registering...' : 'Create Account'}</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-8">
            
            {user?.role === 'ADMIN' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-900 text-sm tracking-wide uppercase flex items-center space-x-2">
                      <Database className="h-4 w-4 text-slate-500" />
                      <span>User Database Registry</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Reading database records using active administrative token</p>
                  </div>
                  <button 
                    onClick={fetchUsers} 
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors"
                    title="Refresh user list"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  {userListError ? (
                    <div className="p-6 text-sm text-rose-600 font-medium">{userListError}</div>
                  ) : userList.length === 0 ? (
                    <div className="p-6 text-sm text-slate-400 text-center">No users registered in registry</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="px-6 py-3">User</th>
                          <th className="px-6 py-3">Role</th>
                          <th className="px-6 py-3">Registered At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {userList.map((usr) => (
                          <tr key={usr.id} className="hover:bg-slate-50/30">
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-950">{usr.name}</div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">{usr.email}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                                usr.role === 'ADMIN' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-700 border border-slate-200'
                              }`}>
                                {usr.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                              {new Date(usr.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900 text-sm tracking-wide uppercase">Developer Audit Log</h2>
                  <p className="text-xs text-slate-500 mt-1">Real-time telemetry tracking client request events</p>
                </div>
                <button 
                  onClick={() => setAuditLogs([])} 
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                >
                  Clear Console
                </button>
              </div>

              <div className="overflow-x-auto max-h-96">
                {auditLogs.length === 0 ? (
                  <div className="p-6 text-sm text-slate-400 text-center">No telemetry logs recorded. Initiate an action.</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-2.5">Time</th>
                        <th className="px-6 py-2.5">Action</th>
                        <th className="px-6 py-2.5">Status</th>
                        <th className="px-6 py-2.5">Telemetry details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-mono">
                      {auditLogs.map((log, index) => (
                        <tr key={index} className="hover:bg-slate-50/30">
                          <td className="px-6 py-3 text-slate-400">{log.timestamp}</td>
                          <td className="px-6 py-3 font-semibold text-slate-700">{log.action}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-xs font-semibold ${
                              log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {log.status === 'SUCCESS' ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <AlertCircle className="h-3 w-3" />
                              )}
                              <span>{log.status}</span>
                            </span>
                          </td>
                          <td className="px-6 py-3 text-slate-500 max-w-[240px] truncate" title={log.details}>
                            {log.details || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
