'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Area, AreaChart, ComposedChart, Legend, ScatterChart, Scatter,
  Treemap, Sankey, FunnelChart, Funnel, LabelList, ReferenceLine, ReferenceArea
} from 'recharts';
import {
  ChartBarIcon,
  TrendingUpIcon,
  ClockIcon,
  UsersIcon,
  AcademicCapIcon,
  StarIcon,
  BoltIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  FireIcon,
  EyeIcon,
  FilterIcon,
  ArrowPathIcon,
  CalendarIcon,
  ChevronDownIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentChartBarIcon,
  PresentationChartLineIcon,
  BeakerIcon,
  CogIcon,
  DownloadIcon,
  ShareIcon,
  PrinterIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ForwardIcon,
  BackwardIcon,
  FunnelIcon,
  TableCellsIcon,
  RectangleGroupIcon,
  CircleStackIcon,
  ChartPieIcon,
  SignalIcon,
  BanknotesIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
  GlobeAltIcon,
  RocketLaunchIcon,
  CpuChipIcon,
  CloudIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ServerIcon,
  DatabaseIcon,
  CubeIcon,
  PuzzlePieceIcon,
  CommandLineIcon,
  CodeBracketIcon,
  BugAntIcon,
  WrenchScrewdriverIcon,
  BuildingOfficeIcon,
  HomeIcon,
  MapPinIcon,
  GlobeAmericasIcon,
  LanguageIcon,
  TranslateIcon,
  SpeakerWaveIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  CameraIcon,
  PhotoIcon,
  DocumentIcon,
  FolderIcon,
  ArchiveBoxIcon,
  InboxIcon,
  PaperAirplaneIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  PhoneIcon,
  DeviceTabletIcon,
  TvIcon,
  RadioIcon,
  NewspaperIcon,
  BookOpenIcon,
  AcademicCapIcon as GraduationIcon,
  PencilIcon,
  PaintBrushIcon,
  SparklesIcon,
  SwatchIcon,
  BeakerIcon as LabIcon,
  FlaskIcon,
  MagnifyingGlassIcon as SearchIcon,
  EyeIcon as ViewIcon,
  EyeSlashIcon,
  HandRaisedIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  HeartIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  ExclamationCircleIcon,
  QuestionMarkCircleIcon,
  LightBulbIcon as IdeaIcon,
  KeyIcon,
  LockClosedIcon,
  LockOpenIcon,
  ShieldExclamationIcon,
  NoSymbolIcon,
  XMarkIcon,
  CheckIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  ArrowUpLeftIcon,
  ArrowDownRightIcon,
  ArrowDownLeftIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  Square2StackIcon,
  Square3Stack3DIcon,
  Squares2X2Icon,
  SquaresPlusIcon,
  WindowIcon,
  Bars3Icon,
  Bars4Icon,
  ListBulletIcon,
  QueueListIcon,
  TableCellsIcon as TableIcon,
  ViewColumnsIcon,
  ViewfinderCircleIcon,
  RectangleStackIcon,
  CircleStackIcon as LayersIcon,
  CubeTransparentIcon,
  PuzzlePieceIcon as PluginIcon,
  CommandLineIcon as TerminalIcon,
  CodeBracketSquareIcon,
  CursorArrowRaysIcon,
  CursorArrowRippleIcon,
  FingerPrintIcon,
  IdentificationIcon,
  KeyIcon as SecurityIcon,
  UserCircleIcon,
  UserIcon,
  UsersIcon as TeamIcon,
  UserPlusIcon,
  UserMinusIcon,
  UserGroupIcon as GroupIcon,
  BuildingStorefrontIcon,
  BuildingOffice2Icon,
  BuildingLibraryIcon,
  HomeModernIcon,
  TruckIcon,
  CarIcon,
  PlaneIcon,
  RocketLaunchIcon as LaunchIcon,
  GiftIcon,
  ShoppingCartIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  BanknotesIcon as MoneyIcon,
  CurrencyDollarIcon,
  CalculatorIcon,
  ScaleIcon,
  ClipboardIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  DocumentPlusIcon,
  DocumentMinusIcon,
  DocumentMagnifyingGlassIcon,
  DocumentCheckIcon,
  DocumentXMarkIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  FolderMinusIcon,
  FolderArrowDownIcon,
  ArchiveBoxArrowDownIcon,
  ArchiveBoxXMarkIcon,
  InboxArrowDownIcon,
  InboxStackIcon,
  PaperClipIcon,
  LinkIcon,
  BookmarkIcon,
  BookmarkSlashIcon,
  BookmarkSquareIcon,
  TagIcon,
  HashtagIcon,
  AtSymbolIcon,
  FlagIcon,
  MapIcon,
  GlobeAsiaAustraliaIcon,
  GlobeEuropeAfricaIcon,
  CompassIcon,
  ClockIcon as TimeIcon,
  CalendarDaysIcon,
  CalendarIcon as CalIcon,
  StopwatchIcon,
  SunIcon,
  MoonIcon,
  CloudSunIcon,
  CloudMoonIcon,
  BoltIcon as LightningIcon,
  FireIcon as FlameIcon,
  SnowflakeIcon,
  WifiIcon,
  SignalSlashIcon,
  WifiIcon as NetworkIcon,
  ServerStackIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  CpuChipIcon as ProcessorIcon,
  CircuitBoardIcon,
  Battery100Icon,
  Battery50Icon,
  Battery0Icon,
  PowerIcon,
  PlayCircleIcon,
  PauseCircleIcon,
  StopCircleIcon,
  ForwardIcon as FastForwardIcon,
  BackwardIcon as RewindIcon,
  SpeakerXMarkIcon,
  SpeakerWaveIcon as VolumeIcon,
  MicrophoneIcon as MicIcon,
  VideoCameraSlashIcon,
  CameraIcon as PhotoCameraIcon,
  FilmIcon,
  MusicalNoteIcon,
  RadioIcon as FMIcon,
  TvIcon as TelevisionIcon,
  ComputerDesktopIcon as DesktopIcon,
  DevicePhoneMobileIcon as MobileIcon,
  DeviceTabletIcon as TabletIcon,
  PrinterIcon as PrintIcon,
  ScannerIcon,
  QrCodeIcon,
  BarsArrowUpIcon,
  BarsArrowDownIcon,
  Bars3BottomLeftIcon,
  Bars3BottomRightIcon,
  Bars3CenterLeftIcon,
  ChartBarSquareIcon,
  ChartPieIcon as PieIcon,
  PresentationChartBarIcon,
  PresentationChartLineIcon as LineIcon,
  CircularProgressIcon,
  FunnelIcon as FilterFunnelIcon,
  AdjustmentsVerticalIcon,
  SliderIcon,
  ToggleIcon,
  SwitchHorizontalIcon,
  SwitchVerticalIcon,
  ArrowPathRoundedSquareIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ArrowUturnUpIcon,
  ArrowUturnDownIcon,
  BackspaceIcon,
  EnterIcon,
  SpacebarIcon,
  CommandIcon,
  ControlIcon,
  OptionIcon,
  ShiftIcon,
  CapsLockIcon,
  TabIcon,
  EscapeIcon,
  DeleteIcon,
  BackspaceIcon as EraseIcon,
  PencilSquareIcon,
  PenToolIcon,
  HighlighterIcon,
  EraserIcon,
  CropIcon,
  ScissorsIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentIcon,
  ClipIcon,
  DuplicateIcon,
  Share2Icon,
  ExternalLinkIcon,
  LinkBreakIcon,
  LinkIcon as ChainIcon,
  UnlinkIcon,
  AnchorIcon,
  PinIcon,
  UnpinIcon,
  PushPinIcon,
  LocationMarkerIcon,
  MapPinIcon as PinLocationIcon,
  NavigationIcon,
  CompassRoseIcon,
  RouteIcon,
  RoadIcon,
  TrafficConeIcon,
  TruckIcon as DeliveryIcon,
  CarIcon as VehicleIcon,
  BusIcon,
  TrainIcon,
  SubwayIcon,
  ShipIcon,
  SailboatIcon,
  HelicopterIcon,
  PlaneIcon as AirplaneIcon,
  RocketIcon,
  SatelliteIcon,
  UfoIcon,
  PlanetIcon,
  StarIcon as AstroIcon,
  SunIcon as SolarIcon,
  MoonIcon as LunarIcon,
  CloudIcon as WeatherIcon,
  RainIcon,
  SnowIcon,
  WindIcon,
  TornadoIcon,
  EarthquakeIcon,
  VolcanoIcon,
  MountainIcon,
  TreeIcon,
  FlowerIcon,
  SeedIcon,
  LeafIcon,
  BranchIcon,
  RootIcon,
  GrassIcon,
  BugIcon,
  ButterflyIcon,
  FishIcon,
  SharkIcon,
  WhaleIcon,
  OctopusIcon,
  JellyfishIcon,
  StarfishIcon,
  ShellIcon,
  CoralIcon,
  SeaweedIcon,
  BirdIcon,
  EagleIcon,
  OwlIcon,
  ParrotIcon,
  CatIcon,
  DogIcon,
  HorseIcon,
  CowIcon,
  PigIcon,
  SheepIcon,
  GoatIcon,
  RabbitIcon,
  SquirrelIcon,
  BearIcon,
  WolfIcon,
  FoxIcon,
  DeerIcon,
  ElephantIcon,
  RhinoIcon,
  HippoIcon,
  GiraffeIcon,
  ZebraIcon,
  LionIcon,
  TigerIcon,
  LeopardIcon,
  CheetahIcon,
  PandaIcon,
  KoalaIcon,
  MonkeyIcon,
  GorillaIcon,
  SlothIcon,
  AntIcon,
  BeeIcon,
  SpiderIcon,
  ScorpionIcon,
  LadybugIcon,
  DragonflyIcon,
  CricketIcon,
  GrasshopperIcon,
  CockroachIcon,
  FlyIcon,
  MosquitoIcon,
  WormIcon,
  CaterpillarIcon,
  SnailIcon,
  SlugIcon,
  CrabIcon,
  LobsterIcon,
  ShrimpIcon,
  SquidIcon,
  SpongeIcon,
  PlanktonIcon,
  AlgaeIcon,
  BacteriaIcon,
  VirusIcon,
  MicrobeIcon,
  CellIcon,
  DNAIcon,
  ChromosomeIcon,
  GeneIcon,
  ProteinIcon,
  MoleculeIcon,
  AtomIcon,
  ElectronIcon,
  ProtonIcon,
  NeutronIcon,
  QuarkIcon,
  PhotonIcon,
  WaveIcon,
  ParticleIcon,
  ForceIcon,
  EnergyIcon,
  MatterIcon,
  PlasmaIcon,
  GasIcon,
  LiquidIcon,
  SolidIcon,
  CrystalIcon,
  DiamondIcon,
  GemIcon,
  MetalIcon,
  IronIcon,
  GoldIcon,
  SilverIcon,
  CopperIcon,
  AluminumIcon,
  TitaniumIcon,
  SteelIcon,
  BronzeIcon,
  TinIcon,
  LeadIcon,
  ZincIcon,
  NickelIcon,
  CobaltIcon,
  ChromiumIcon,
  ManganeseIcon,
  TungstenIcon,
  PlatinumIcon,
  PalladiumIcon,
  RhodiumIcon,
  IridiumIcon,
  OsmiumIcon,
  RutheniumIcon,
  RheniumIcon,
  TechnetiumIcon,
  MolybdenumIcon,
  NiobiumIcon,
  ZirconiumIcon,
  YttriumIcon,
  StrontiumIcon,
  RubidiumIcon,
  KryptonIcon,
  BromineIcon,
  SeleniumIcon,
  ArsenicIcon,
  GermaniumIcon,
  GalliumIcon,
  ThalliumIcon,
  LeadIcon as PlumbumIcon,
  BismuthIcon,
  PoloniumIcon,
  AstatineIcon,
  RadonIcon,
  FranciumIcon,
  RadiumIcon,
  ActiniumIcon,
  ThoriumIcon,
  ProtactiniumIcon,
  UraniumIcon,
  NeptuniumIcon,
  PlutoniumIcon,
  AmericiumIcon,
  CuriumIcon,
  BerkeliumIcon,
  CaliforniumIcon,
  EinsteiniumIcon,
  FermiumIcon,
  MendeleviumIcon,
  NobeliumIcon,
  LawrenciumIcon,
  RutherfordiumIcon,
  DubniumIcon,
  SeaborgiumIcon,
  BohriumIcon,
  HassiumIcon,
  MeitneriumIcon,
  DarmstadtiumIcon,
  RoentgeniumIcon,
  CoperniciumIcon,
  NihoniumIcon,
  FleroviumIcon,
  MoscoviumIcon,
  LivermoriumIcon,
  TennessineIcon,
  OganessonIcon
} from '@heroicons/react/24/outline';

// Types
interface DataPoint {
  name: string;
  value: number;
  category?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'radar' | 'area' | 'composed' | 'scatter' | 'treemap' | 'funnel' | 'sankey';
  title: string;
  subtitle?: string;
  data: DataPoint[];
  colors?: string[];
  xAxisKey?: string;
  yAxisKey?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  height?: number;
  width?: number;
  responsive?: boolean;
  animated?: boolean;
  interactive?: boolean;
  exportable?: boolean;
  filterable?: boolean;
  zoomable?: boolean;
  realTime?: boolean;
  refreshInterval?: number;
}

interface TimeSeriesData {
  timestamp: string;
  value: number;
  category: string;
  metadata?: Record<string, any>;
}

interface AssessmentAnalytics {
  completionRates: DataPoint[];
  participationTrends: TimeSeriesData[];
  performanceMetrics: DataPoint[];
  oceanCoverage: DataPoint[];
  userEngagement: DataPoint[];
  assessmentTypes: DataPoint[];
  durationAnalysis: DataPoint[];
  errorRates: DataPoint[];
  retakeAnalysis: DataPoint[];
  demographicBreakdown: DataPoint[];
  competencyGaps: DataPoint[];
  learningPathProgress: DataPoint[];
  feedbackScores: DataPoint[];
  businessImpact: DataPoint[];
  costAnalysis: DataPoint[];
  roiMetrics: DataPoint[];
}

// Color palettes
const COLOR_PALETTES = {
  primary: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'],
  ocean: ['#1E40AF', '#059669', '#D97706', '#DC2626', '#7C3AED'],
  performance: ['#22C55E', '#EAB308', '#F97316', '#EF4444'],
  engagement: ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B'],
  neutral: ['#6B7280', '#9CA3AF', '#D1D5DB', '#F3F4F6'],
  gradient: ['#3B82F6', '#1D4ED8', '#1E40AF', '#1E3A8A'],
};

// Chart configuration presets
const CHART_PRESETS = {
  assessmentCompletion: {
    type: 'bar' as const,
    title: 'Assessment Completion Rates',
    subtitle: 'Monthly completion statistics',
    colors: COLOR_PALETTES.primary,
    showLegend: true,
    showGrid: true,
    animated: true,
    height: 300,
  },
  oceanCoverage: {
    type: 'radar' as const,
    title: 'OCEAN Model Coverage',
    subtitle: 'Personality trait assessment coverage',
    colors: COLOR_PALETTES.ocean,
    showLegend: true,
    height: 350,
  },
  performanceTrends: {
    type: 'line' as const,
    title: 'Performance Trends',
    subtitle: 'Assessment scores over time',
    colors: COLOR_PALETTES.performance,
    showGrid: true,
    animated: true,
    height: 280,
  },
  userEngagement: {
    type: 'area' as const,
    title: 'User Engagement',
    subtitle: 'Daily active users and session duration',
    colors: COLOR_PALETTES.engagement,
    showGrid: true,
    height: 300,
  },
  assessmentTypes: {
    type: 'pie' as const,
    title: 'Assessment Distribution',
    subtitle: 'By assessment type',
    colors: COLOR_PALETTES.primary,
    showLegend: true,
    height: 300,
  },
  businessImpact: {
    type: 'composed' as const,
    title: 'Business Impact Metrics',
    subtitle: 'ROI and performance correlation',
    colors: COLOR_PALETTES.primary,
    showLegend: true,
    showGrid: true,
    height: 350,
  },
};

// Helper functions
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatPercentage = (num: number): string => `${num.toFixed(1)}%`;

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const generateTrendData = (baseValue: number, points: number, variance: number): DataPoint[] => {
  const data: DataPoint[] = [];
  let currentValue = baseValue;
  
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.5) * variance;
    currentValue += change;
    data.push({
      name: `Point ${i + 1}`,
      value: Math.max(0, Math.round(currentValue)),
      timestamp: new Date(Date.now() - (points - i) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  
  return data;
};

// Chart wrapper component
const ChartWrapper: React.FC<{
  config: ChartConfig;
  children: React.ReactNode;
  onExport?: () => void;
  onFilter?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}> = ({ config, children, onExport, onFilter, onRefresh, isLoading }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
          {config.subtitle && (
            <p className="text-sm text-gray-600 mt-1">{config.subtitle}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {config.filterable && (
            <button
              onClick={onFilter}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Filter data"
            >
              <FilterIcon className="h-4 w-4" />
            </button>
          )}
          
          {config.realTime && (
            <button
              onClick={onRefresh}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Refresh data"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          )}
          
          {config.exportable && (
            <button
              onClick={onExport}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Export chart"
            >
              <DownloadIcon className="h-4 w-4" />
            </button>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <MinusIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>
      
      {/* Chart Content */}
      <div className={`transition-all duration-300 ${isExpanded ? 'h-auto' : ''}`}>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div style={{ height: config.height || 300 }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

// Individual chart components
const BarChartComponent: React.FC<{ config: ChartConfig }> = ({ config }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={config.data}>
      {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
      <XAxis dataKey={config.xAxisKey || 'name'} />
      <YAxis />
      {config.showTooltip && <Tooltip />}
      {config.showLegend && <Legend />}
      <Bar 
        dataKey={config.yAxisKey || 'value'} 
        fill={config.colors?.[0] || '#3B82F6'}
        animationDuration={config.animated ? 1000 : 0}
      />
    </BarChart>
  </ResponsiveContainer>
);

const LineChartComponent: React.FC<{ config: ChartConfig }> = ({ config }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={config.data}>
      {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
      <XAxis dataKey={config.xAxisKey || 'name'} />
      <YAxis />
      {config.showTooltip && <Tooltip />}
      {config.showLegend && <Legend />}
      <Line
        type="monotone"
        dataKey={config.yAxisKey || 'value'}
        stroke={config.colors?.[0] || '#3B82F6'}
        strokeWidth={2}
        dot={{ fill: config.colors?.[0] || '#3B82F6' }}
        animationDuration={config.animated ? 1000 : 0}
      />
    </LineChart>
  </ResponsiveContainer>
);

const PieChartComponent: React.FC<{ config: ChartConfig }> = ({ config }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={config.data}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        outerRadius={80}
        fill="#8884d8"
        dataKey={config.yAxisKey || 'value'}
        animationDuration={config.animated ? 1000 : 0}
      >
        {config.data.map((entry, index) => (
          <Cell 
            key={`cell-${index}`} 
            fill={config.colors?.[index % config.colors!.length] || '#3B82F6'} 
          />
        ))}
      </Pie>
      {config.showTooltip && <Tooltip />}
      {config.showLegend && <Legend />}
    </PieChart>
  </ResponsiveContainer>
);

const RadarChartComponent: React.FC<{ config: ChartConfig }> = ({ config }) => (
  <ResponsiveContainer width="100%" height="100%">
    <RadarChart data={config.data}>
      <PolarGrid />
      <PolarAngleAxis dataKey={config.xAxisKey || 'name'} />
      <PolarRadiusAxis domain={[0, 100]} />
      <Radar
        name="Value"
        dataKey={config.yAxisKey || 'value'}
        stroke={config.colors?.[0] || '#3B82F6'}
        fill={config.colors?.[0] || '#3B82F6'}
        fillOpacity={0.3}
        animationDuration={config.animated ? 1000 : 0}
      />
      {config.showTooltip && <Tooltip />}
      {config.showLegend && <Legend />}
    </RadarChart>
  </ResponsiveContainer>
);

const AreaChartComponent: React.FC<{ config: ChartConfig }> = ({ config }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={config.data}>
      {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
      <XAxis dataKey={config.xAxisKey || 'name'} />
      <YAxis />
      {config.showTooltip && <Tooltip />}
      {config.showLegend && <Legend />}
      <Area
        type="monotone"
        dataKey={config.yAxisKey || 'value'}
        stroke={config.colors?.[0] || '#3B82F6'}
        fill={config.colors?.[0] || '#3B82F6'}
        fillOpacity={0.7}
        animationDuration={config.animated ? 1000 : 0}
      />
    </AreaChart>
  </ResponsiveContainer>
);

const ComposedChartComponent: React.FC<{ config: ChartConfig }> = ({ config }) => (
  <ResponsiveContainer width="100%" height="100%">
    <ComposedChart data={config.data}>
      {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
      <XAxis dataKey={config.xAxisKey || 'name'} />
      <YAxis />
      {config.showTooltip && <Tooltip />}
      {config.showLegend && <Legend />}
      <Bar dataKey="value" fill={config.colors?.[0] || '#3B82F6'} />
      <Line
        type="monotone"
        dataKey="value"
        stroke={config.colors?.[1] || '#10B981'}
        strokeWidth={2}
      />
    </ComposedChart>
  </ResponsiveContainer>
);

// Chart selector component
const ChartSelector: React.FC<{
  selectedType: ChartConfig['type'];
  onTypeChange: (type: ChartConfig['type']) => void;
}> = ({ selectedType, onTypeChange }) => {
  const chartTypes = [
    { type: 'bar' as const, label: 'Bar Chart', icon: ChartBarIcon },
    { type: 'line' as const, label: 'Line Chart', icon: PresentationChartLineIcon },
    { type: 'pie' as const, label: 'Pie Chart', icon: ChartPieIcon },
    { type: 'radar' as const, label: 'Radar Chart', icon: SignalIcon },
    { type: 'area' as const, label: 'Area Chart', icon: PresentationChartBarIcon },
    { type: 'composed' as const, label: 'Composed Chart', icon: DocumentChartBarIcon },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {chartTypes.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          onClick={() => onTypeChange(type)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedType === type
              ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

// Main visualization suite component
export const AssessmentVisualizationSuite: React.FC<{
  analytics: AssessmentAnalytics;
  onExport?: (chartId: string, format: 'png' | 'svg' | 'pdf') => void;
  onFilter?: (chartId: string, filters: Record<string, any>) => void;
  realTimeEnabled?: boolean;
  interactiveMode?: boolean;
}> = ({ 
  analytics, 
  onExport, 
  onFilter, 
  realTimeEnabled = false, 
  interactiveMode = true 
}) => {
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof CHART_PRESETS>('assessmentCompletion');
  const [customConfig, setCustomConfig] = useState<ChartConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Generate chart configurations
  const chartConfigs = useMemo(() => {
    return {
      completionRates: {
        ...CHART_PRESETS.assessmentCompletion,
        data: analytics.completionRates,
        realTime: realTimeEnabled,
        exportable: true,
        filterable: true,
      },
      oceanCoverage: {
        ...CHART_PRESETS.oceanCoverage,
        data: analytics.oceanCoverage,
        exportable: true,
      },
      performanceTrends: {
        ...CHART_PRESETS.performanceTrends,
        data: analytics.performanceMetrics,
        realTime: realTimeEnabled,
        exportable: true,
        filterable: true,
      },
      userEngagement: {
        ...CHART_PRESETS.userEngagement,
        data: analytics.userEngagement,
        realTime: realTimeEnabled,
        exportable: true,
      },
      assessmentTypes: {
        ...CHART_PRESETS.assessmentTypes,
        data: analytics.assessmentTypes,
        exportable: true,
      },
      businessImpact: {
        ...CHART_PRESETS.businessImpact,
        data: analytics.businessImpact,
        exportable: true,
        filterable: true,
      },
    };
  }, [analytics, realTimeEnabled]);

  const renderChart = (config: ChartConfig) => {
    switch (config.type) {
      case 'bar':
        return <BarChartComponent config={config} />;
      case 'line':
        return <LineChartComponent config={config} />;
      case 'pie':
        return <PieChartComponent config={config} />;
      case 'radar':
        return <RadarChartComponent config={config} />;
      case 'area':
        return <AreaChartComponent config={config} />;
      case 'composed':
        return <ComposedChartComponent config={config} />;
      default:
        return <BarChartComponent config={config} />;
    }
  };

  const handleExport = (chartId: string) => {
    onExport?.(chartId, 'png');
  };

  const handleFilter = (chartId: string) => {
    onFilter?.(chartId, {});
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Assessment Analytics</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh All</span>
            </button>
          </div>
        </div>
        
        {/* Preset selector */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(CHART_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => setSelectedPreset(key as keyof typeof CHART_PRESETS)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPreset === key
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {preset.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Rates */}
        <ChartWrapper
          config={chartConfigs.completionRates}
          onExport={() => handleExport('completionRates')}
          onFilter={() => handleFilter('completionRates')}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        >
          {renderChart(chartConfigs.completionRates)}
        </ChartWrapper>

        {/* OCEAN Coverage */}
        <ChartWrapper
          config={chartConfigs.oceanCoverage}
          onExport={() => handleExport('oceanCoverage')}
          isLoading={isLoading}
        >
          {renderChart(chartConfigs.oceanCoverage)}
        </ChartWrapper>

        {/* Performance Trends */}
        <ChartWrapper
          config={chartConfigs.performanceTrends}
          onExport={() => handleExport('performanceTrends')}
          onFilter={() => handleFilter('performanceTrends')}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        >
          {renderChart(chartConfigs.performanceTrends)}
        </ChartWrapper>

        {/* User Engagement */}
        <ChartWrapper
          config={chartConfigs.userEngagement}
          onExport={() => handleExport('userEngagement')}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        >
          {renderChart(chartConfigs.userEngagement)}
        </ChartWrapper>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assessment Types */}
        <ChartWrapper
          config={chartConfigs.assessmentTypes}
          onExport={() => handleExport('assessmentTypes')}
          isLoading={isLoading}
        >
          {renderChart(chartConfigs.assessmentTypes)}
        </ChartWrapper>

        {/* Business Impact */}
        <div className="lg:col-span-2">
          <ChartWrapper
            config={chartConfigs.businessImpact}
            onExport={() => handleExport('businessImpact')}
            onFilter={() => handleFilter('businessImpact')}
            isLoading={isLoading}
          >
            {renderChart(chartConfigs.businessImpact)}
          </ChartWrapper>
        </div>
      </div>

      {/* Custom Chart Builder */}
      {interactiveMode && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Chart Builder</h3>
          <ChartSelector
            selectedType={customConfig?.type || 'bar'}
            onTypeChange={(type) => setCustomConfig({ 
              ...customConfig, 
              type,
              title: 'Custom Chart',
              data: analytics.completionRates,
            } as ChartConfig)}
          />
          
          {customConfig && (
            <ChartWrapper
              config={customConfig}
              onExport={() => handleExport('custom')}
              isLoading={isLoading}
            >
              {renderChart(customConfig)}
            </ChartWrapper>
          )}
        </div>
      )}
    </div>
  );
};

export default AssessmentVisualizationSuite;