'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  BellIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  EyeSlashIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ChatBubbleLeftIcon,
  TranslateIcon,
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  FunnelIcon,
  TagIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  StarIcon,
  HeartIcon,
  BookmarkIcon,
  ShareIcon,
  LinkIcon,
  DocumentTextIcon,
  PhotoIcon,
  VideoCameraIcon,
  MicrophoneIcon,
  MapPinIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  ComputerDesktopIcon as DesktopIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardIcon,
  ClipboardDocumentIcon,
  DocumentDuplicateIcon,
  ArrowTopRightOnSquareIcon,
  EnvelopeIcon,
  PhoneIcon,
  PrinterIcon,
  CogIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  KeyIcon,
  FingerPrintIcon,
  CommandLineIcon,
  CodeBracketIcon,
  BugAntIcon,
  BeakerIcon,
  AcademicCapIcon,
  LightBulbIcon,
  FireIcon,
  BoltIcon,
  SparklesIcon,
  RocketLaunchIcon,
  GiftIcon,
  TrophyIcon,
  FlagIcon,
  CubeIcon,
  PuzzlePieceIcon,
  SwatchIcon,
  PaintBrushIcon,
  EyeDropperIcon,
  Squares2X2Icon,
  ViewColumnsIcon,
  RectangleStackIcon,
  CircleStackIcon,
  Square3Stack3DIcon,
  ListBulletIcon,
  QueueListIcon,
  TableCellsIcon,
  ChartBarIcon,
  ChartPieIcon,
  PresentationChartLineIcon,
  SignalIcon,
  WifiIcon,
  CloudIcon,
  ServerIcon,
  DatabaseIcon,
  CpuChipIcon,
  CircuitBoardIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  CalculatorIcon,
  ScaleIcon,
  BuildingOfficeIcon,
  HomeIcon,
  ArchiveBoxIcon,
  FolderIcon,
  InboxIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  MegaphoneIcon,
  ChatBubbleBottomCenterTextIcon,
  SpeakerPhoneIcon,
  RadioIcon,
  TvIcon,
  FilmIcon,
  MusicalNoteIcon,
  CameraIcon,
  NewspaperIcon,
  BookOpenIcon,
  PencilIcon,
  PencilSquareIcon,
  TrashIcon,
  ArchiveBoxArrowDownIcon,
  DocumentArrowDownIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  FolderArrowDownIcon,
  InboxArrowDownIcon,
  DocumentCheckIcon,
  DocumentPlusIcon,
  DocumentMinusIcon,
  DocumentMagnifyingGlassIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  ArchiveBoxXMarkIcon,
  InboxStackIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ArrowPathRoundedSquareIcon,
  ForwardIcon,
  BackwardIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  SpeakerWaveIcon as VolumeUpIcon,
  SpeakerXMarkIcon as VolumeOffIcon,
  MicrophoneIcon as MicIcon,
  VideoCameraIcon as VideoIcon,
  VideoCameraSlashIcon,
  HandRaisedIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  QuestionMarkCircleIcon,
  ExclamationCircleIcon,
  LightBulbIcon as IdeaIcon,
  AdjustmentsVerticalIcon,
  Bars3Icon,
  Bars4Icon,
  BarsArrowUpIcon,
  BarsArrowDownIcon,
  EllipsisHorizontalIcon,
  EllipsisVerticalIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ZoomInIcon,
  ZoomOutIcon,
  FullscreenIcon,
  MinimizeIcon,
  WindowIcon,
  RectangleGroupIcon,
  NoSymbolIcon,
  StopCircleIcon,
  PlayCircleIcon,
  PauseCircleIcon,
  PowerIcon,
  LockOpenIcon,
  UnlockIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon as WarningIcon,
  InformationCircleIcon as InfoIcon,
  CheckCircleIcon as SuccessIcon,
  XCircleIcon as ErrorIcon,
  ClockIcon as TimeIcon,
  CalendarDaysIcon,
  StopwatchIcon,
  AlarmClockIcon,
  TimerIcon,
  HourglassIcon,
  SandClockIcon,
  CalendarIcon as CalIcon,
  WeatherIcon,
  SunIcon as DayIcon,
  MoonIcon as NightIcon,
  CloudSunIcon,
  CloudMoonIcon,
  RainIcon,
  SnowflakeIcon,
  BoltIcon as LightningIcon,
  WindIcon,
  FogIcon,
  ThunderstormIcon,
  TornadoIcon,
  HurricaneIcon,
  DroughtIcon,
  FloodIcon,
  EarthquakeIcon,
  VolcanoIcon,
  WildfireIcon,
  AvalancheIcon,
  LandslideIcon,
  TsunamiIcon
} from '@heroicons/react/24/outline';

// Types
interface SearchResult {
  id: string;
  type: 'assessment' | 'user' | 'report' | 'organization' | 'page' | 'action';
  title: string;
  description: string;
  url: string;
  metadata?: Record<string, any>;
  relevance: number;
  category?: string;
  tags?: string[];
  lastModified?: string;
  author?: string;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system' | 'user' | 'assessment';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionable: boolean;
  actions?: Array<{
    label: string;
    action: string;
    data?: any;
    variant: 'primary' | 'secondary' | 'danger';
  }>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
  expiresAt?: string;
  data?: Record<string, any>;
}

interface AccessibilitySettings {
  screenReader: boolean;
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  focusVisible: boolean;
  keyboardNavigation: boolean;
  colorBlindSupport: boolean;
  fontSize: number;
  lineHeight: number;
  colorScheme: 'light' | 'dark' | 'auto';
  language: string;
  announcements: boolean;
  alternativeText: boolean;
  skipLinks: boolean;
}

interface CollaborationFeatures {
  comments: boolean;
  realTimeEditing: boolean;
  presence: boolean;
  sharedCursor: boolean;
  voiceChat: boolean;
  videoChat: boolean;
  screenShare: boolean;
  annotations: boolean;
  suggestions: boolean;
  trackChanges: boolean;
}

// Global Search Component
const GlobalSearch: React.FC<{
  onSearch: (query: string) => Promise<SearchResult[]>;
  onResultSelect: (result: SearchResult) => void;
  placeholder?: string;
  shortcuts?: boolean;
}> = ({ onSearch, onResultSelect, placeholder = 'Search everything...', shortcuts = true }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);
  
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const debouncedSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.trim().length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const searchResults = await onSearch(searchQuery);
        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [onSearch]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      debouncedSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, debouncedSearch]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleResultSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          searchRef.current?.blur();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, results]);

  // Global keyboard shortcut
  useEffect(() => {
    if (!shortcuts) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [shortcuts]);

  const handleResultSelect = (result: SearchResult) => {
    onResultSelect(result);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    
    // Add to recent searches
    setRecentSearches(prev => {
      const updated = [query, ...prev.filter(q => q !== query)].slice(0, 5);
      return updated;
    });
    
    // Add to search history
    setSearchHistory(prev => {
      const updated = [result, ...prev.filter(r => r.id !== result.id)].slice(0, 10);
      return updated;
    });
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'assessment': return <ClipboardDocumentIcon className="h-4 w-4" />;
      case 'user': return <UserIcon className="h-4 w-4" />;
      case 'report': return <DocumentTextIcon className="h-4 w-4" />;
      case 'organization': return <BuildingOfficeIcon className="h-4 w-4" />;
      case 'page': return <GlobeAltIcon className="h-4 w-4" />;
      case 'action': return <BoltIcon className="h-4 w-4" />;
      default: return <DocumentTextIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="relative w-full max-w-lg">
      {/* Search Input */}
      <div className="relative">
        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          placeholder={placeholder}
          aria-label="Global search"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          autoComplete="off"
        />
        {shortcuts && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">⌘K</kbd>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
          role="listbox"
        >
          {isLoading && (
            <div className="p-4 text-center">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-sm text-gray-500">Searching...</span>
            </div>
          )}

          {!isLoading && query.length >= 2 && results.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              No results found for "{query}"
            </div>
          )}

          {!isLoading && query.length < 2 && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recent searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(search)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                >
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                    <span>{search}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="p-2">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleResultSelect(result)}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                    selectedIndex === index ? 'bg-gray-100' : ''
                  }`}
                  role="option"
                  aria-selected={selectedIndex === index}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5 text-gray-400">
                      {getResultIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {result.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {result.description}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-400 capitalize">
                          {result.type}
                        </span>
                        {result.category && (
                          <>
                            <span className="text-xs text-gray-300">•</span>
                            <span className="text-xs text-gray-400">
                              {result.category}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-xs text-gray-400">
                      {Math.round(result.relevance * 100)}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Notification Center Component
const NotificationCenter: React.FC<{
  notifications: Notification[];
  onNotificationAction: (notificationId: string, action: string, data?: any) => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  realTime?: boolean;
}> = ({
  notifications,
  onNotificationAction,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  realTime = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const urgentCount = notifications.filter(n => n.priority === 'urgent' && !n.read).length;

  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'urgent':
        return notifications.filter(n => n.priority === 'urgent');
      default:
        return notifications;
    }
  }, [notifications, filter]);

  // Play notification sound
  useEffect(() => {
    if (soundEnabled && audioRef.current && unreadCount > 0) {
      audioRef.current.play().catch(() => {
        // Ignore autoplay restrictions
      });
    }
  }, [unreadCount, soundEnabled]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'error': return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'system': return <CogIcon className="h-5 w-5 text-blue-500" />;
      case 'user': return <UserIcon className="h-5 w-5 text-purple-500" />;
      case 'assessment': return <ClipboardDocumentIcon className="h-5 w-5 text-indigo-500" />;
      default: return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'normal': return 'border-l-blue-500 bg-blue-50';
      case 'low': return 'border-l-gray-500 bg-gray-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="relative">
      {/* Notification Sound */}
      <audio
        ref={audioRef}
        preload="auto"
        aria-hidden="true"
      >
        <source src="/sounds/notification.mp3" type="audio/mpeg" />
        <source src="/sounds/notification.ogg" type="audio/ogg" />
      </audio>

      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg"
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {urgentCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 rounded-full h-2 w-2 animate-pulse"></span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title={soundEnabled ? 'Disable sound' : 'Enable sound'}
                >
                  {soundEnabled ? <SpeakerWaveIcon className="h-4 w-4" /> : <SpeakerXMarkIcon className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex space-x-1 mt-3">
              {[
                { key: 'all', label: 'All', count: notifications.length },
                { key: 'unread', label: 'Unread', count: unreadCount },
                { key: 'urgent', label: 'Urgent', count: urgentCount },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    filter === tab.key
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-1 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={onMarkAllAsRead}
                  className="text-indigo-600 hover:text-indigo-800"
                  disabled={unreadCount === 0}
                >
                  Mark all as read
                </button>
                <button
                  onClick={onClearAll}
                  className="text-red-600 hover:text-red-800"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                <p className="text-gray-500">
                  {filter === 'unread' ? 'All caught up!' : 'You have no notifications'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 border-l-4 ${getPriorityColor(notification.priority)} ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                          </div>
                          {!notification.read && (
                            <button
                              onClick={() => onMarkAsRead(notification.id)}
                              className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded"
                              title="Mark as read"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.timestamp)}
                          </span>
                          {notification.category && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                              {notification.category}
                            </span>
                          )}
                        </div>

                        {/* Notification Actions */}
                        {notification.actionable && notification.actions && (
                          <div className="flex items-center space-x-2 mt-3">
                            {notification.actions.map((action, index) => (
                              <button
                                key={index}
                                onClick={() => onNotificationAction(notification.id, action.action, action.data)}
                                className={`px-3 py-1 text-xs rounded-md font-medium ${
                                  action.variant === 'primary'
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : action.variant === 'danger'
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                }`}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Accessibility Settings Component
const AccessibilitySettings: React.FC<{
  settings: AccessibilitySettings;
  onSettingsChange: (settings: AccessibilitySettings) => void;
  isOpen: boolean;
  onClose: () => void;
}> = ({ settings, onSettingsChange, isOpen, onClose }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const updateSetting = (key: keyof AccessibilitySettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const resetToDefaults = () => {
    const defaultSettings: AccessibilitySettings = {
      screenReader: false,
      highContrast: false,
      largeText: false,
      reducedMotion: false,
      focusVisible: true,
      keyboardNavigation: true,
      colorBlindSupport: false,
      fontSize: 16,
      lineHeight: 1.5,
      colorScheme: 'auto',
      language: 'en',
      announcements: true,
      alternativeText: true,
      skipLinks: true,
    };
    setLocalSettings(defaultSettings);
    onSettingsChange(defaultSettings);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Accessibility Settings</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              aria-label="Close accessibility settings"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Visual Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Visual Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">High Contrast</label>
                  <p className="text-sm text-gray-500">Increase color contrast for better visibility</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.highContrast}
                    onChange={(e) => updateSetting('highContrast', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Large Text</label>
                  <p className="text-sm text-gray-500">Increase text size for better readability</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.largeText}
                    onChange={(e) => updateSetting('largeText', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Color Blind Support</label>
                  <p className="text-sm text-gray-500">Adjust colors for color vision deficiency</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.colorBlindSupport}
                    onChange={(e) => updateSetting('colorBlindSupport', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Font Size: {localSettings.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={localSettings.fontSize}
                  onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color Scheme</label>
                <select
                  value={localSettings.colorScheme}
                  onChange={(e) => updateSetting('colorScheme', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="auto">System Default</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>
          </div>

          {/* Motion and Animation */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Motion and Animation</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Reduced Motion</label>
                  <p className="text-sm text-gray-500">Minimize animations and transitions</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.reducedMotion}
                    onChange={(e) => updateSetting('reducedMotion', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Navigation and Interaction */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Navigation and Interaction</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Keyboard Navigation</label>
                  <p className="text-sm text-gray-500">Enable full keyboard navigation</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.keyboardNavigation}
                    onChange={(e) => updateSetting('keyboardNavigation', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Focus Indicators</label>
                  <p className="text-sm text-gray-500">Show visible focus indicators</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.focusVisible}
                    onChange={(e) => updateSetting('focusVisible', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Skip Links</label>
                  <p className="text-sm text-gray-500">Enable skip to content links</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.skipLinks}
                    onChange={(e) => updateSetting('skipLinks', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Screen Reader Support */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Screen Reader Support</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Screen Reader Mode</label>
                  <p className="text-sm text-gray-500">Optimize for screen reader usage</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.screenReader}
                    onChange={(e) => updateSetting('screenReader', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Announcements</label>
                  <p className="text-sm text-gray-500">Announce system changes and updates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.announcements}
                    onChange={(e) => updateSetting('announcements', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Alternative Text</label>
                  <p className="text-sm text-gray-500">Provide detailed alt text for images</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.alternativeText}
                    onChange={(e) => updateSetting('alternativeText', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Language */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Language</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interface Language</label>
              <select
                value={localSettings.language}
                onChange={(e) => updateSetting('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Reset to Defaults
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Advanced Features Module
export const AdvancedFeaturesModule: React.FC<{
  onSearch?: (query: string) => Promise<SearchResult[]>;
  onSearchResultSelect?: (result: SearchResult) => void;
  notifications?: Notification[];
  onNotificationAction?: (notificationId: string, action: string, data?: any) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  onClearNotifications?: () => void;
  accessibilitySettings?: AccessibilitySettings;
  onAccessibilityChange?: (settings: AccessibilitySettings) => void;
  enableSearch?: boolean;
  enableNotifications?: boolean;
  enableAccessibility?: boolean;
  enableCollaboration?: boolean;
}> = ({
  onSearch = async () => [],
  onSearchResultSelect = () => {},
  notifications = [],
  onNotificationAction = () => {},
  onMarkAsRead = () => {},
  onMarkAllAsRead = () => {},
  onClearNotifications = () => {},
  accessibilitySettings = {
    screenReader: false,
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    focusVisible: true,
    keyboardNavigation: true,
    colorBlindSupport: false,
    fontSize: 16,
    lineHeight: 1.5,
    colorScheme: 'auto',
    language: 'en',
    announcements: true,
    alternativeText: true,
    skipLinks: true,
  },
  onAccessibilityChange = () => {},
  enableSearch = true,
  enableNotifications = true,
  enableAccessibility = true,
  enableCollaboration = false,
}) => {
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);

  return (
    <div className="flex items-center space-x-4">
      {/* Global Search */}
      {enableSearch && (
        <GlobalSearch
          onSearch={onSearch}
          onResultSelect={onSearchResultSelect}
        />
      )}

      {/* Notification Center */}
      {enableNotifications && (
        <NotificationCenter
          notifications={notifications}
          onNotificationAction={onNotificationAction}
          onMarkAsRead={onMarkAsRead}
          onMarkAllAsRead={onMarkAllAsRead}
          onClearAll={onClearNotifications}
        />
      )}

      {/* Accessibility Settings */}
      {enableAccessibility && (
        <>
          <button
            onClick={() => setShowAccessibilitySettings(true)}
            className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg"
            aria-label="Accessibility settings"
            title="Accessibility settings"
          >
            <AdjustmentsHorizontalIcon className="h-6 w-6" />
          </button>

          <AccessibilitySettings
            settings={accessibilitySettings}
            onSettingsChange={onAccessibilityChange}
            isOpen={showAccessibilitySettings}
            onClose={() => setShowAccessibilitySettings(false)}
          />
        </>
      )}

      {/* Collaboration Features (placeholder) */}
      {enableCollaboration && (
        <button
          className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg"
          aria-label="Collaboration tools"
          title="Collaboration tools"
        >
          <ChatBubbleLeftIcon className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};

export default AdvancedFeaturesModule;