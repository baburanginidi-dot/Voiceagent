
import React, { useState, useEffect, useRef } from 'react';
import { AnalyticsData, CallLog, Stage, StageDocument } from '../types';
import { MockAdminService } from '../services/mockAdminService';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';

interface AdminPanelProps {
  onExit: () => void;
}

type Tab = 'dashboard' | 'prompts' | 'stages' | 'logs';

export const AdminPanel: React.FC<AdminPanelProps> = ({ onExit }) => {
  const { refreshConfig } = useConfig();
  const { showToast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
  const [saveButtonState, setSaveButtonState] = useState<'save' | 'saving' | 'saved'>('save');

  // Logs Filter & Detail State
  const [logFilter, setLogFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);

  // State for Stage Editing
  const [expandedStageId, setExpandedStageId] = useState<number | null>(null);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastStageSaveTime, setLastStageSaveTime] = useState<string | null>(null);
  const [stageSaveButtonState, setStageSaveButtonState] = useState<'save' | 'saving' | 'saved'>('save');

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Debounce search input for performance (Production requirement)
  useEffect(() => {
      const handler = setTimeout(() => {
          setDebouncedFilter(logFilter);
      }, 300);
      return () => clearTimeout(handler);
  }, [logFilter]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Phase 3 - Replace with API call to POST /api/auth/login
    if (username === 'mahammad_wahab' && password === 'osjjhujq1oacb36tcqnhmi') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid credentials. Please check your username and password.');
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load from real API endpoints
      const backendUrl = (process.env.BACKEND_URL as string) || 
        `${window.location.protocol}//${window.location.hostname}:3001`;
      
      const [analyticsRes, logsRes, configRes] = await Promise.all([
        fetch(`${backendUrl}/api/analytics/analytics`),
        fetch(`${backendUrl}/api/analytics/logs`),
        fetch(`${backendUrl}/api/config/system-prompts`)
      ]);
      
      const analyticsData = await analyticsRes.json();
      const logsData = await logsRes.json();
      const configData = await configRes.json();
      
      setAnalytics(analyticsData.data || {});
      setLogs(logsData.logs || []);
      setStages(configData.stages || []);
      
      // Get first stage prompt or use default
      const firstPrompt = configData.systemPrompts?.[0]?.prompt || '';
      setPrompt(firstPrompt);
    } catch (error) {
      console.error('Failed to load data:', error);
      // Use mock service as fallback
      const [stats, recentLogs, config] = await Promise.all([
        MockAdminService.getAnalytics(),
        MockAdminService.getRecentLogs(),
        MockAdminService.getSystemConfig()
      ]);
      setAnalytics(stats);
      setLogs(recentLogs);
      // @ts-ignore
      setPrompt(config.systemPrompt);
      // @ts-ignore
      setStages(config.stages);
    }
    setIsLoading(false);
  };

  const handleSavePrompt = async () => {
    setSaveButtonState('saving');
    setIsSaving(true);
    try {
      // Get backend URL from environment or current location
      const backendUrl = (process.env.BACKEND_URL as string) || 
        `${window.location.protocol}//${window.location.hostname}:3001`;
      
      const response = await fetch(`${backendUrl}/api/config/system-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: 1, prompt })
      });
      
      if (!response.ok) throw new Error('Failed to save prompt');
      
      // Notify Dashboard of config change
      await refreshConfig();
      
      // Update save feedback
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      setLastSaveTime(timeStr);
      setSaveButtonState('saved');
      
      showToast('System prompt updated. AI will use new instructions from the next session.', 'success', 3500);
      
      // Reset button state after 2 seconds
      setTimeout(() => setSaveButtonState('save'), 2000);
      setIsSaving(false);
    } catch (error) {
      console.error('Failed to save prompt:', error);
      setSaveButtonState('save');
      setIsSaving(false);
      showToast('Failed to save system prompt. Please try again.', 'error', 3500);
    }
  };

  const toggleStageExpand = (stage: Stage) => {
    if (expandedStageId === stage.id) {
        setExpandedStageId(null);
        setEditingStage(null);
    } else {
        setExpandedStageId(stage.id);
        setEditingStage({ ...stage, documents: stage.documents || [] }); 
    }
  };

  const handleStageChange = (field: keyof Stage, value: string) => {
    if (editingStage) {
        setEditingStage({ ...editingStage, [field]: value });
    }
  };

  // --- Document Upload Logic ---
  const triggerFileUpload = () => {
      fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editingStage) return;

      const allowedTypes = ['text/plain', 'text/markdown', 'application/json', '']; 
      
      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result as string;
          const newDoc: StageDocument = {
              id: Date.now().toString(), // TODO: Backend will assign UUID
              name: file.name,
              content: content,
              type: file.type || 'text/plain'
          };

          setEditingStage(prev => {
              if(!prev) return null;
              return {
                  ...prev,
                  documents: [...(prev.documents || []), newDoc]
              };
          });
      };
      reader.readAsText(file);
      e.target.value = ''; 
  };

  const handleDeleteDocument = (docId: string) => {
      setEditingStage(prev => {
          if (!prev) return null;
          return {
              ...prev,
              documents: prev.documents?.filter(d => d.id !== docId) || []
          };
      });
  };

  const saveStageChanges = async () => {
      if (!editingStage) return;
      setStageSaveButtonState('saving');
      setIsSaving(true);
      
      try {
        // TODO: Phase 3 - PUT /api/config/stages/:id
        const updatedStages = stages.map(s => s.id === editingStage.id ? editingStage : s);
        await MockAdminService.updateStages(updatedStages);
        setStages(updatedStages);
        // Notify Dashboard of config change
        await refreshConfig();
        
        // Update save feedback
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        setLastStageSaveTime(timeStr);
        setStageSaveButtonState('saved');
        
        showToast('Stage configuration saved. New settings will apply from the next call.', 'success', 3500);
        
        // Reset button state after 2 seconds
        setTimeout(() => setStageSaveButtonState('save'), 2000);
        
        setIsSaving(false);
        setExpandedStageId(null);
        setEditingStage(null);
      } catch (error) {
        console.error('Failed to save stage changes:', error);
        setStageSaveButtonState('save');
        setIsSaving(false);
        showToast('Failed to save stage configuration. Please try again.', 'error', 3500);
      }
  };

  const handleAddNewStage = () => {
    const newStageId = Math.max(...stages.map(s => s.id), 0) + 1;
    const newStage: Stage = {
      id: newStageId,
      title: `New Stage ${newStageId}`,
      description: 'Stage description',
      systemPrompt: '',
      knowledgeBase: '',
      documents: []
    };
    
    const updatedStages = [...stages, newStage];
    setStages(updatedStages);
    setExpandedStageId(newStageId);
    setEditingStage(newStage);
  };

  const handleDeleteStage = async (stageId: number) => {
    if (confirm(`Are you sure you want to delete Stage ${stageId}? This action cannot be undone.`)) {
      try {
        await MockAdminService.deleteStage(stageId);
        const updatedStages = stages.filter(s => s.id !== stageId);
        setStages(updatedStages);
        setExpandedStageId(null);
        setEditingStage(null);
        showToast('Stage deleted successfully.', 'success', 3500);
      } catch (error) {
        console.error('Failed to delete stage:', error);
        showToast('Failed to delete stage. Please try again.', 'error', 3500);
      }
    }
  };

  const renderSidebar = () => (
    <div className="w-64 bg-white border-r border-[#EAEAF0] h-full flex flex-col">
      <div className="p-6 border-b border-[#EAEAF0]">
        <h1 className="text-xl font-bold tracking-tight">Admin Portal</h1>
        <span className="text-xs text-[#8E8E93]">NxtWave Voice Agent</span>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {(['dashboard', 'prompts', 'stages', 'logs'] as Tab[]).map((tab) => (
             <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-4 py-3 rounded-[12px] text-sm font-medium transition-colors capitalize ${activeTab === tab ? 'bg-black text-white' : 'text-[#4F4F4F] hover:bg-[#F2F2F2]'}`}
            >
                {tab === 'prompts' ? 'System Prompt' : tab}
            </button>
        ))}
      </nav>
      <div className="p-4 border-t border-[#EAEAF0]">
        <button onClick={onExit} className="w-full px-4 py-2 border border-[#EAEAF0] rounded-[12px] text-sm font-medium text-[#FF3B30] hover:bg-[#FFF5F5]">
          Exit to App
        </button>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const callsChangeColor = (analytics?.callsChange ?? 0) >= 0 ? 'text-green-500' : 'text-red-500';
    const callsChangeIcon = (analytics?.callsChange ?? 0) >= 0 ? '↑' : '↓';
    const conversionChangeColor = (analytics?.conversionChange ?? 0) >= 0 ? 'text-green-500' : 'text-red-500';
    const conversionChangeIcon = (analytics?.conversionChange ?? 0) >= 0 ? '↑' : '↓';
    
    return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-2xl font-bold">Overview</h2>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[24px] border border-[#EAEAF0] shadow-sm">
          <div className="text-[#8E8E93] text-sm font-medium mb-1">Total Calls</div>
          <div className="text-3xl font-bold">{analytics?.totalCalls}</div>
          <div className={`${callsChangeColor} text-xs font-medium mt-2`}>
            {callsChangeIcon} {Math.abs(analytics?.callsChange ?? 0)}% vs last week
          </div>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-[#EAEAF0] shadow-sm">
          <div className="text-[#8E8E93] text-sm font-medium mb-1">Avg. Duration</div>
          <div className="text-3xl font-bold">{analytics?.avgDuration}</div>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-[#EAEAF0] shadow-sm">
          <div className="text-[#8E8E93] text-sm font-medium mb-1">Conversion Rate</div>
          <div className="text-3xl font-bold">{analytics?.conversionRate}%</div>
          <div className={`${conversionChangeColor} text-xs font-medium mt-2`}>
            {conversionChangeIcon} {Math.abs(analytics?.conversionChange ?? 0)}% vs last week
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[24px] border border-[#EAEAF0] shadow-sm">
        <h3 className="font-bold mb-6">Stage Conversion Funnel</h3>
        
        {/* Visualization Chart */}
        <div className="mb-8">
          <div className="h-64 flex items-end justify-between gap-3">
            {analytics?.dropOffByStage.map((val, i) => {
              const maxVal = Math.max(...(analytics?.dropOffByStage || [1]), 1);
              const heightPercent = (val / maxVal) * 100;
              const conversionRate = analytics?.totalCalls && analytics?.totalCalls > 0 
                ? Math.round((val / analytics.totalCalls) * 100) 
                : 0;
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-3">
                  <div 
                    className="w-full bg-gradient-to-t from-[#4F9EFF] to-[#E6ECFF] rounded-t-[12px] transition-all hover:from-[#2563eb] hover:to-[#93C5FD] shadow-md relative group" 
                    style={{ height: `${heightPercent}%`, minHeight: '30px' }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-sm font-bold text-[#1F2937]">
                      {val}
                    </div>
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-white">
                      {conversionRate}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-[#1F2937]">Stage {i + 1}</div>
                    <div className="text-[10px] text-[#8E8E93]">{conversionRate}% conversion</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stage Breakdown Table */}
        <div className="mt-8 pt-6 border-t border-[#EAEAF0]">
          <h4 className="font-semibold text-sm mb-4 text-[#1F2937]">Detailed Stage Statistics</h4>
          <div className="space-y-3">
            {['Introduction & Rapport', 'Program Value', 'Payment Structure', 'NBFC & 0% EMI', 'Right Co-Applicant', 'KYC Completion'].map((stageName, i) => {
              const count = analytics?.dropOffByStage[i] || 0;
              const conversionRate = analytics?.totalCalls && analytics?.totalCalls > 0 
                ? Math.round((count / analytics.totalCalls) * 100)
                : 0;
              const dropoffFromPrevious = i === 0 ? 0 : ((analytics?.dropOffByStage[i-1] || 0) - count);
              const dropoffPercent = i === 0 ? 0 : ((dropoffFromPrevious / (analytics?.dropOffByStage[i-1] || 1)) * 100);
              
              return (
                <div key={i} className="flex items-center justify-between p-3 bg-[#F9F9FB] rounded-lg hover:bg-[#F2F2F2] transition-colors">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#1F2937]">Stage {i + 1}: {stageName}</div>
                    <div className="text-xs text-[#8E8E93]">
                      {count} users reached • {conversionRate}% of total
                      {i > 0 && dropoffPercent > 0 && <span className="ml-2 text-red-500">({Math.round(dropoffPercent)}% drop-off)</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-[#E6ECFF] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#4F9EFF] to-[#93C5FD]" 
                        style={{ width: `${conversionRate}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-[#1F2937] w-12 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-[#EAEAF0] grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-[#F9F9FB] rounded-lg">
            <div className="text-2xl font-bold text-[#4F9EFF]">{analytics?.totalCalls || 0}</div>
            <div className="text-xs text-[#8E8E93] mt-1">Total Started</div>
          </div>
          <div className="text-center p-3 bg-[#F9F9FB] rounded-lg">
            <div className="text-2xl font-bold text-[#4F9EFF]">{analytics?.dropOffByStage[2] || 0}</div>
            <div className="text-xs text-[#8E8E93] mt-1">Reached Payment</div>
          </div>
          <div className="text-center p-3 bg-[#F9F9FB] rounded-lg">
            <div className="text-2xl font-bold text-[#4F9EFF]">{analytics?.conversionRate || 0}%</div>
            <div className="text-xs text-[#8E8E93] mt-1">Conversion Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
  };

  const renderPrompts = () => (
    <div className="space-y-4 h-full flex flex-col animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">System Instruction</h2>
          <p className="text-sm text-[#8E8E93] mt-1">Configure the core personality and logic driver for Maya</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button 
              onClick={handleSavePrompt} 
              disabled={isSaving}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                saveButtonState === 'saving' ? 'bg-gray-400 text-white cursor-wait' :
                saveButtonState === 'saved' ? 'bg-green-600 text-white' :
                'bg-black text-white hover:scale-105'
              }`}
          >
              {saveButtonState === 'saving' ? 'Saving...' : 
               saveButtonState === 'saved' ? '✓ Saved' : 
               'Save Changes'}
          </button>
          {lastSaveTime && (
            <p className="text-xs text-[#8E8E93]">Saved at {lastSaveTime}</p>
          )}
        </div>
      </div>
      <p className="text-[#4F4F4F] text-sm">
        This is the core personality and logic driver. Variables like <code className="bg-[#F2F2F2] px-1 rounded">{`{{Student Name}}`}</code> are injected dynamically.
      </p>
      <textarea 
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="flex-1 w-full bg-[#F9F9FB] rounded-[16px] p-6 font-mono text-sm leading-relaxed border border-[#EAEAF0] focus:outline-none focus:ring-2 focus:ring-[#E6ECFF] resize-none"
        spellCheck={false}
      />
    </div>
  );

  const renderStages = () => (
    <div className="space-y-6 animate-fadeIn pb-10">
       <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Stage Configuration</h2>
              <p className="text-sm text-[#8E8E93] mt-1">Manage onboarding stages and AI instructions</p>
            </div>
            <button 
              onClick={handleAddNewStage}
              className="bg-black text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-gray-800 transition-colors"
            >
                + Add New Stage
            </button>
       </div>
       
       <div className="space-y-4">
         {stages.map((stage) => {
             const isExpanded = expandedStageId === stage.id;
             const data = isExpanded ? editingStage! : stage;
             
             return (
               <div key={stage.id} className={`bg-white rounded-[20px] border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-black shadow-lg ring-1 ring-black/5' : 'border-[#EAEAF0] hover:border-[#D1D1D6]'}`}>
                 <div 
                    onClick={() => toggleStageExpand(stage)}
                    className="p-5 flex items-start gap-4 cursor-pointer"
                 >
                    <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm shrink-0 mt-1">
                        {stage.id}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                             <h3 className="text-lg font-bold text-black">{stage.title}</h3>
                             <div className="px-3 py-1 bg-[#F2F2F2] rounded-full text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">
                                Active
                             </div>
                        </div>
                        <p className="text-[#8E8E93] text-sm mt-1">{stage.description}</p>
                    </div>
                 </div>

                 {isExpanded && (
                     <div className="px-5 pb-6 pt-2 bg-[#F9F9FB]/50 border-t border-[#EAEAF0] space-y-5 animate-fadeIn">
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-[#4F4F4F] uppercase tracking-wider mb-2">Stage Title</label>
                            <input 
                              type="text"
                              value={data.title || ''}
                              onChange={(e) => handleStageChange('title', e.target.value)}
                              className="w-full bg-white border border-[#EAEAF0] rounded-[12px] px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5"
                              placeholder="e.g., Introduction & Rapport"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-bold text-[#4F4F4F] uppercase tracking-wider mb-2">Stage Description</label>
                            <input 
                              type="text"
                              value={data.description || ''}
                              onChange={(e) => handleStageChange('description', e.target.value)}
                              className="w-full bg-white border border-[#EAEAF0] rounded-[12px] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                              placeholder="Brief description of this stage"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-[#4F4F4F] uppercase tracking-wider mb-2">System Prompt</label>
                                <textarea 
                                    value={data.systemPrompt || ''}
                                    onChange={(e) => handleStageChange('systemPrompt', e.target.value)}
                                    className="w-full h-40 bg-white border border-[#EAEAF0] rounded-[12px] p-4 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/5 resize-none"
                                    placeholder="Stage specific instructions..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#4F4F4F] uppercase tracking-wider mb-2">Knowledge Base</label>
                                <textarea 
                                    value={data.knowledgeBase || ''}
                                    onChange={(e) => handleStageChange('knowledgeBase', e.target.value)}
                                    className="w-full h-40 bg-white border border-[#EAEAF0] rounded-[12px] p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/5 resize-none"
                                    placeholder="Key facts and context..."
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                             <label className="block text-xs font-bold text-[#4F4F4F] uppercase tracking-wider mb-3">Context Documents (RAG)</label>
                             <div className="bg-white rounded-[16px] border border-[#EAEAF0] p-4">
                                {data.documents && data.documents.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        {data.documents.map(doc => (
                                            <div key={doc.id} className="flex items-center justify-between bg-[#F9F9FB] p-3 rounded-[12px] group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-black/5 rounded-lg flex items-center justify-center text-lg">📄</div>
                                                    <div>
                                                        <div className="text-sm font-medium text-black">{doc.name}</div>
                                                        <div className="text-[10px] text-[#8E8E93] uppercase">{doc.type || 'text/plain'}</div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteDocument(doc.id)}
                                                    className="text-[#FF3B30] opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-lg text-sm"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div 
                                    onClick={triggerFileUpload}
                                    className="w-full border-2 border-dashed border-[#EAEAF0] rounded-[12px] h-20 flex flex-col items-center justify-center cursor-pointer hover:border-black/20 hover:bg-[#F9F9FB] transition-all"
                                >
                                    <span className="text-sm font-semibold text-[#4F4F4F]">+ Upload Document</span>
                                    <span className="text-[10px] text-[#8E8E93] mt-1">Supports TXT, MD, JSON</span>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileUpload} 
                                        className="hidden" 
                                        accept=".txt,.md,.json"
                                    />
                                </div>
                             </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-[#EAEAF0]/50">
                             <div>
                               {lastStageSaveTime && (
                                 <p className="text-xs text-[#8E8E93]">Saved at {lastStageSaveTime}</p>
                               )}
                             </div>
                             <div className="flex gap-3">
                               <button 
                                  onClick={() => handleDeleteStage(stage.id)}
                                  className="px-5 py-2.5 rounded-[12px] text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                               >
                                  Delete
                               </button>
                               <button 
                                  onClick={() => toggleStageExpand(stage)}
                                  className="px-5 py-2.5 rounded-[12px] text-sm font-medium text-[#4F4F4F] hover:bg-[#EAEAF0] transition-colors"
                               >
                                  Cancel
                               </button>
                               <button 
                                  onClick={saveStageChanges}
                                  disabled={isSaving}
                                  className={`px-6 py-2.5 rounded-[12px] text-sm font-bold transition-all shadow-sm ${
                                    stageSaveButtonState === 'saving' ? 'bg-gray-400 text-white cursor-wait' :
                                    stageSaveButtonState === 'saved' ? 'bg-green-600 text-white' :
                                    'bg-black text-white hover:bg-gray-900'
                                  }`}
                               >
                                  {stageSaveButtonState === 'saving' ? 'Saving...' : 
                                   stageSaveButtonState === 'saved' ? '✓ Saved' : 
                                   'Save Configuration'}
                               </button>
                             </div>
                        </div>
                     </div>
                 )}
               </div>
             );
         })}
       </div>
    </div>
  );

  const renderLogs = () => {
    const filteredLogs = logs.filter(log => {
        const term = debouncedFilter.toLowerCase();
        const matchesSearch = 
            log.studentName.toLowerCase().includes(term) || 
            log.phoneNumber.includes(term) ||
            log.paymentMethod?.toLowerCase().includes(term) ||
            log.aiSummary.toLowerCase().includes(term);
            
        const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-end">
                <h2 className="text-2xl font-bold">Call Logs</h2>
                <div className="flex gap-3">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search name, phone, payment..." 
                            value={logFilter}
                            onChange={(e) => setLogFilter(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-[#EAEAF0] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-black/5 w-72"
                        />
                        <svg className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-white border border-[#EAEAF0] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-black/5 cursor-pointer"
                    >
                        <option value="All">All Status</option>
                        <option value="Completed">Completed</option>
                        <option value="Payment Selected">Payment Selected</option>
                        <option value="Dropped">Dropped</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-[24px] border border-[#EAEAF0] overflow-hidden shadow-sm">
                <table className="w-full table-fixed">
                    <thead className="bg-[#F9F9FB] border-b border-[#EAEAF0]">
                        <tr>
                            <th className="w-32 px-6 py-4 text-left text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">Student</th>
                            <th className="w-32 px-6 py-4 text-left text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">Phone</th>
                            <th className="w-24 px-6 py-4 text-left text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">Date</th>
                            <th className="w-32 px-6 py-4 text-left text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">Status</th>
                            <th className="w-32 px-6 py-4 text-left text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">Payment</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">AI Summary</th>
                            <th className="w-24 px-6 py-4 text-right text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAEAF0]">
                        {filteredLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-[#F9F9FB] transition-colors group">
                                <td className="px-6 py-4 text-sm font-bold truncate">{log.studentName}</td>
                                <td className="px-6 py-4 text-sm text-[#4F4F4F] font-mono truncate">{log.phoneNumber}</td>
                                <td className="px-6 py-4 text-sm text-[#4F4F4F] truncate">{log.date.split(' ')[0]}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${
                                        log.status === 'Completed' ? 'bg-green-50 text-green-600 border border-green-100' :
                                        log.status === 'Dropped' ? 'bg-red-50 text-red-600 border border-red-100' :
                                        'bg-blue-50 text-blue-600 border border-blue-100'
                                    }`}>
                                        {log.status === 'Payment Selected' ? 'Payment' : log.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-[#4F4F4F]">
                                    {log.paymentMethod ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 whitespace-nowrap">
                                            {log.paymentMethod}
                                        </span>
                                    ) : (
                                        <span className="text-gray-300">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-[#4F4F4F]">
                                    <div className="line-clamp-2 text-xs leading-relaxed text-gray-600" title={log.aiSummary}>
                                        {log.aiSummary}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => setSelectedLog(log)}
                                        className="text-black hover:bg-black hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
                                    >
                                        Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-[24px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-[#EAEAF0] flex justify-between items-start bg-[#F9F9FB]">
                            <div>
                                <h3 className="text-xl font-bold text-black">{selectedLog.studentName}</h3>
                                <div className="text-sm text-[#4F4F4F] mt-1 flex gap-3">
                                    <span>{selectedLog.phoneNumber}</span>
                                    <span>•</span>
                                    <span>{selectedLog.date}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-[#EAEAF0] rounded-full transition-colors">
                                <svg className="w-6 h-6 text-[#8E8E93]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="mb-8">
                                <h4 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-3">AI Summary</h4>
                                <div className="bg-[#F5F7FF] border border-[#E6ECFF] p-4 rounded-[16px] text-sm text-[#4F4F4F] leading-relaxed">
                                    {selectedLog.aiSummary}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-3">Transcript</h4>
                                <div className="space-y-3">
                                    {selectedLog.transcript.map((t) => (
                                        <div key={t.id} className={`flex ${t.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                                                t.sender === 'user' 
                                                ? 'bg-black text-white rounded-br-none' 
                                                : 'bg-[#F2F2F2] text-black rounded-bl-none'
                                            }`}>
                                                <div className="text-[10px] opacity-50 mb-1 uppercase tracking-wide">{t.sender}</div>
                                                {t.text}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] font-['Inter'] p-6">
        <div className="w-full max-w-[360px] bg-white p-8 rounded-[32px] shadow-lg border border-[#EAEAF0]">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold mb-2 tracking-tight">Admin Portal</h1>
            <p className="text-sm text-[#8E8E93]">Restricted Access</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#4F4F4F] mb-1.5 ml-1">USERNAME</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-12 px-4 bg-[#F9F9FB] rounded-[16px] text-sm focus:outline-none focus:ring-2 focus:ring-black/5 border-transparent transition-all"
                placeholder="Enter username"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4F4F4F] mb-1.5 ml-1">PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 bg-[#F9F9FB] rounded-[16px] text-sm focus:outline-none focus:ring-2 focus:ring-black/5 border-transparent transition-all"
                placeholder="Enter password"
              />
            </div>
            {authError && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-[12px] text-center font-medium">
                {authError}
              </div>
            )}
            <button
              type="submit"
              className="w-full h-12 bg-black text-white font-semibold rounded-[20px] text-sm hover:scale-[0.98] transition-transform shadow-md mt-2"
            >
              Authenticate
            </button>
             <button 
              type="button"
              onClick={onExit}
              className="w-full py-2 text-xs text-[#8E8E93] hover:text-black transition-colors"
            >
              ← Return to App
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
        <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex text-black font-['Inter']">
      {renderSidebar()}
      <main className="flex-1 p-8 h-screen overflow-y-auto">
        <div className="max-w-5xl mx-auto h-full pb-10">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'prompts' && renderPrompts()}
            {activeTab === 'stages' && renderStages()}
            {activeTab === 'logs' && renderLogs()}
        </div>
      </main>
    </div>
  );
};
