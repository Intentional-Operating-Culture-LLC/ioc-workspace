'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CogIcon,
  UsersIcon,
  ChartBarIcon,
  DatabaseIcon,
  ServerIcon,
  ShieldCheckIcon,
  ClockIcon,
  BellIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  WrenchScrewdriverIcon,
  CloudIcon,
  CpuChipIcon,
  SignalIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  AdjustmentsHorizontalIcon,
  AdjustmentsVerticalIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  UserMinusIcon,
  UserGroupIcon,
  KeyIcon,
  LockClosedIcon,
  LockOpenIcon,
  FingerPrintIcon,
  IdentificationIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  MapPinIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  TagIcon,
  FlagIcon,
  StarIcon,
  HeartIcon,
  BookmarkIcon,
  ChatBubbleLeftIcon,
  PaperAirplaneIcon,
  ShareIcon,
  LinkIcon,
  DocumentTextIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  FolderIcon,
  PhotoIcon,
  VideoCameraIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  MusicalNoteIcon,
  FilmIcon,
  CameraIcon,
  PrinterIcon,
  ScannerIcon,
  QrCodeIcon,
  BarsArrowUpIcon,
  BarsArrowDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  CheckIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ForwardIcon,
  BackwardIcon,
  SquareIcon,
  CircleStackIcon,
  RectangleStackIcon,
  Square3Stack3DIcon,
  CubeIcon,
  BeakerIcon,
  FlaskIcon,
  TestTubeIcon,
  MicroscopeIcon,
  LightBulbIcon,
  BoltIcon,
  FireIcon,
  SnowflakeIcon,
  SunIcon,
  MoonIcon,
  CloudSunIcon,
  RainIcon,
  ThunderstormIcon,
  WindIcon,
  FogIcon,
  HailIcon,
  TornadoIcon,
  EarthquakeIcon,
  VolcanoIcon,
  FloodIcon,
  DroughtIcon,
  WildfireIcon,
  SnowstormIcon,
  BlizzardIcon,
  HurricaneIcon,
  TyphoonIcon,
  CycloneIcon,
  TsunamiIcon,
  AvalancheIcon,
  LandslideIcon,
  SandstormIcon,
  MudslideIcon,
  SinkholeLegendIcon,
  GeyserIcon,
  HotSpringIcon,
  GlacierIcon,
  IcebergIcon,
  TundraIcon,
  DesertIcon,
  OasisIcon,
  SavannaIcon,
  PrairieIcon,
  SteppeIcon,
  MeadowIcon,
  ForestIcon,
  JungleIcon,
  RainforestIcon,
  SwampIcon,
  MarshIcon,
  BogIcon,
  FenIcon,
  MoorIcon,
  HeathIcon,
  ShrublandIcon,
  ChapparalIcon,
  SclerophyllIcon,
  MontaneIcon,
  AlpineIcon,
  SubalpineIcon,
  NivalIcon,
  PolarIcon,
  ArcticIcon,
  AntarcticIcon,
  BoreaIcon,
  TemperateIcon,
  SubtropicalIcon,
  TropicalIcon,
  EquatorialIcon,
  MonsoonIcon,
  AridIcon,
  SemiaridIcon,
  HumidIcon,
  SubhumidIcon,
  PerhumidIcon,
  HyperhumidIcon,
  MegathermalIcon,
  MesotermalIcon,
  MicrothermalIcon,
  CryothermalIcon,
  FrigidIcon,
  GelisIcon,
  PermagelIcon,
  SeasonalIcon,
  DiurnalIcon,
  ContinentalIcon,
  MaritimeIcon,
  OceanicIcon,
  LittorialIcon,
  PelagicIcon,
  AbyssalIcon,
  BenthicIcon,
  PlanktnonicIcon,
  NektonicIcon,
  NeustonicIcon,
  EpipelagicIcon,
  MesopelagicIcon,
  BathypelagicIcon,
  AbyssopelagicIcon,
  HadalpelagicIcon,
  EuphobicIcon,
  DyspoticIcon,
  AphoticIcon,
  PhotosyntheticIcon,
  ChemosynthericIcon,
  AutotrophicIcon,
  HeterotrophicIcon,
  SaprophyticIcon,
  ParasiticIcon,
  SymbioticIcon,
  MutualisticIcon,
  CommensalIcon,
  PredatoryIcon,
  HerbivorousIcon,
  CarnivorousIcon,
  OmnivorousIcon,
  InvertebrateLevelIcon,
  VertebrateIcon,
  MammalIcon,
  BirdIcon,
  ReptileIcon,
  AmphibianIcon,
  FishIcon,
  SharkIcon,
  RayIcon,
  EelIcon,
  SalmonIcon,
  TunaIcon,
  CodIcon,
  HerringIcon,
  SardineIcon,
  AnchovyIcon,
  MackerelIcon,
  SnowpenIcon,
  HalibutIcon,
  SoleIcon,
  FlounderIcon,
  TurbotIcon,
  PlaceIcon,
  DabIcon,
  BrillIcon,
  MonkfishIcon,
  AnglerIcon,
  GroupeIcon,
  SeabassIcon,
  RedSnapperIcon,
  YellowfinIcon,
  MahiMahiIcon,
  BarracudaIcon,
  WahoIcon,
  KingMackerelIcon,
  CobiaIcon,
  AmberjackIcon,
  PompanoIcon,
  PermitIcon,
  BonefishIcon,
  TarpoIcon,
  SailfishIcon,
  MarlinIcon,
  SpearfishIcon,
  SwordfishIcon,
  SharkIcon as SharkIcon2,
  HammerheadIcon,
  TigersharkIcon,
  BullSharkIcon,
  GreatWhiteIcon,
  MakoIcon,
  BlueSharkIcon,
  NurseSharkIcon,
  LemonSharkIcon,
  SandTigerIcon,
  ThresherIcon,
  BaskinSharkIcon,
  WhaleSharkIcon,
  GoblinSharkIcon,
  CookieCutterIcon,
  AngelSharkIcon,
  SawSharkIcon,
  FrillSharkIcon,
  SixGillIcon,
  SevenGillIcon,
  RayIcon as RayIcon2,
  MantaRayIcon,
  StingrayIcon,
  ElectricRayIcon,
  SkateIcon,
  GuitarfishIcon,
  SawfishIcon,
  ChimeraIcon,
  RatfishIcon,
  GhostSharkIcon,
  CoelacanIcon,
  LungfishIcon,
  GarIcon,
  BowfinIcon,
  PaddlefishIcon,
  SturgeonIcon,
  SheadIcon,
  TarpIcon,
  EelIcon as EelIcon2,
  SnakeEelIcon,
  CongerEelIcon,
  MorayIcon,
  ElectricEelIcon,
  KnifefishIcon,
  CatfishIcon,
  BullheadIcon,
  MadtomIcon,
  WalkingCatfishIcon,
  UpsidonwCatfishIcon,
  GlassCatfishIcon,
  WelsCatfishIcon,
  RedtailCatfishIcon,
  FlatheadCatfishIcon,
  ChannelCatfishIcon,
  BlueCatfishIcon,
  WhiteCatfishIcon,
  YellowCatfishIcon,
  BrownBullheadIcon,
  BlackBullheadIcon,
  YellowBullheadIcon,
  CarPIcon,
  GoldfishIcon,
  KoiIcon,
  BarlelIcon,
  ChubIcon,
  DaceIcon,
  MinnowIcon,
  ShinerIcon,
  SuckerIcon,
  RedhorseIcon,
  BuffaloIcon,
  QuillbackIcon,
  ChubsuckerIcon,
  RedfinIcon,
  RetrieveIcon,
  PikeIcon,
  MuskieIcon,
  PickerelIcon,
  TroutIcon,
  SalmonIcon as SalmonIcon2,
  CharIcon,
  GraylingIcon,
  WhitefishIcon,
  CiscoIcon,
  InconuIcon,
  SmeltIcon,
  CaplinIcon,
  HerpingIcon,
  SardineIcon as SardineIcon2,
  MenhadenIcon,
  PilchardIcon,
  ShadIcon,
  AlexifeIcon,
  BoneyfishIcon,
  MilkfishIcon,
  FeatherlackIcon,
  KillifishIcon,
  TopminnowIcon,
  MosquitofishIcon,
  GuppyIcon,
  MollieIcon,
  PlatyIcon,
  SwordrailIcon,
  PupfishIcon,
  FoureyesIcon,
  HalfbeakIcon,
  NeedlefishIcon,
  FlyingfishIcon,
  BallyhooIcon,
  SauryIcon,
  SkippjackIcon,
  BonitoIcon,
  AlbacoreIcon,
  BlufinIcon,
  YellowfinIcon as YellowfinIcon2,
  BigeyeIcon,
  SkipjackIcon,
  BulletIcon,
  FrigateIcon,
  BlackfinIcon,
  LittleIcon,
  KawakwaIcon,
  WahoIcon as WahoIcon2,
  DolphinfishIcon,
  MahimahiIcon,
  PompanoIcon as PompanoIcon2,
  PermitIcon as PermitIcon2,
  JackIcon,
  AmberjackIcon as AmberjackIcon2,
  YellowjackIcon,
  BluejackIcon,
  CrevaleIcon,
  HorseeyeIcon,
  LookdownIcon,
  PermitIcon as PermitIcon3,
  RoosterfishIcon,
  LeatherbackIcon,
  BumperIcon,
  ScadIcon,
  RoundScadIcon,
  BigeyeScadIcon,
  AkoIcon,
  MackerelScadIcon,
  RunnerIcon,
  BluerunnerIcon,
  YellowrnnerIcon,
  RainbowrnnerIcon,
  ThreadfinIcon,
  LeatherjackIcon,
  AlmancoIcon,
  MoonjishIcon,
  TriggerfishIcon,
  QueenTriggerfishIcon,
  GrayTriggerfishIcon,
  BalckTriggerfishIcon,
  RedlineTriggerfishIcon,
  OrangelineTriggerfishIcon,
  UnicornfishIcon,
  SurgepnfishIcon,
  TangIcon,
  BlueTagIcon,
  YellowTaigIcon,
  PowderBlueIcon,
  SohalIcon,
  NasoIcon,
  VlamingIcon,
  ConvictIcon,
  MoorishIcon,
  BannerfishIcon,
  ButterfishIcon,
  AngelfishIcon,
  QuenAngelfishIcon,
  GrayAngelfishIcon,
  FrenchAngelfishIcon,
  RockBeautyIcon,
  TownsendAngelfishIcon,
  QueenAngelfishIcon as QueenAngelfishIcon2,
  KingAngelfishIcon,
  EmperorAngelfishIcon,
  BluefaceIcon,
  MapleleafIcon,
  SemicircleIcon,
  YellowbarIcon,
  BlueringedIcon,
  KoranIcon,
  RedseaIcon,
  AsianIcon,
  IndianIcon,
  PacificIcon,
  AtlanticIcon,
  ArcticIcon as ArcticIcon2,
  SouthernIcon,
  AntarcticIcon as AntarcticIcon2,
  NorthernIcon,
  EasternIcon,
  WesternIcon,
  CentralIcon,
  MediterraneanIcon,
  CaribbeanIcon,
  GuylIcon,
  BermudaIcon,
  SargassoIcon,
  LabradIcon,
  BarentsIcon,
  NorwegianIcon,
  GreenlandIcon,
  BeaufortIcon,
  ChukchiIcon,
  EastSiberianIcon,
  LaptevIcon,
  KaraIcon,
  BarentsIcon as BarentsIcon2,
  WhiteIcon,
  BalticIcon,
  NorthIcon,
  IrishIcon,
  CelticIcon,
  BayiscayIcon,
  EglishIcon,
  ChannelIcon,
  AdraticIcon,
  AegeanIcon,
  IonianIcon,
  TyrrhenianIcon,
  LigurianIcon,
  AlboranIcon,
  BalearicIcon,
  SardinianIcon,
  CorsicaIcon,
  SicilyIcon,
  CretelIcon,
  CyprusIcon,
  RhodesIcon,
  LesbosIcon,
  ChiosIcon,
  SamosIcon,
  IcarialIcon,
  PatmosIcon,
  LemnoisIcon,
  ThasoIcon,
  SamothraceIcon,
  ImvrosIcon,
  TenedosIcon,
  BozcaadaIcon,
  GokcaedaIcon,
  MudanIcon,
  OkunicIcon,
  AkiskoIcon,
  UnitedKirkeisIcon,
  RenoIcon,
  AlaskanIcon,
  DutchIcon,
  BriticIcon,
  FrenchIcon,
  SpanishIcon,
  PortugueseIcon,
  ItalianIcon,
  GermanIcon,
  DanishIcon,
  SwedishIcon,
  NorwegiaIcon,
  FinnishIcon,
  RussianIcon,
  PolishIcon,
  CzechIcon,
  SlovakIcon,
  HungarianIcon,
  RomanianIcon,
  BulgarianIcon,
  SerbianIcon,
  CroatianIcon,
  SlovenianIcon,
  BosnianIcon,
  MacedonainIcon,
  MontegrinIcon,
  AlbanianIcon,
  GreekIcon,
  TurkishIcon,
  UkraiianIcon,
  BelarusianIcon,
  LatvianIcon,
  LithuanianIcon,
  EstonianIcon,
  GeorgainIcon,
  ArmeniaIcon,
  AzerbajaniIcon,
  IranianIcon,
  IraqiIcon,
  SaudiIcon,
  YemeniIcon,
  OmaniIcon,
  EmiratiIcon,
  QatariIcon,
  BahrainiIcon,
  KuwaitiIcon,
  IsraeliIcon,
  PalestinianIcon,
  JordanianIcon,
  LebanesIcon,
  SyrianIcon,
  ChineseIcon,
  JapaneseIcon,
  KoreanIcon,
  VietnameseIcon,
  ThaiIcon,
  CambodianIcon,
  LaotianIcon,
  MyanmarIcon,
  MalaynIcon,
  SingaporeanIcon,
  IndonesianIcon,
  BruneiIcon,
  PhilippineIcon,
  TaiwanIcon,
  HongkongIcon,
  MacauIcon,
  IndianIcon as IndianIcon2,
  PakistaniIcon,
  BangladeshiIcon,
  SriLankaIcon,
  MaldiviaIcon,
  NepalIcon,
  BhutanIcon,
  AfghaIcon,
  UzebIcon,
  KazakhIcon,
  KyrgyzIcon,
  TajikIcon,
  TurkmenIcon,
  MongoliaIcon,
  TibetIcon,
  AustralianIcon,
  NewZealarIcon,
  PapuaIcon,
  FijianIcon,
  SamoanIcon,
  TongaIcon,
  CookIcon,
  FrenchPolynesiaIcon,
  NewCalednoiaIcon,
  VanuatuIcon,
  SolomanIcon,
  KiribatiIcon,
  TuvaluIcon,
  NauruIcon,
  MarshallIcon,
  PalauIcon,
  MicronesianIcon,
  GuamIcon,
  NorthernIcon as NorthernIcon2,
  HawaiiIcon,
  AmericanIcon,
  CanadianIcon,
  MexicanIcon,
  GuatemalIcon,
  BelizeanIcon,
  HonduraIcon,
  SalvadorIcon,
  NicaragianIcon,
  CostarRcanIcon,
  PanamanIcon,
  CubanIcon,
  JamaicanIcon,
  HaitianIcon,
  DominicanIcon,
  PuertoRicnIcon,
  TrinidadIcon,
  BarbadianIcon,
  StLucianIcon,
  VincentineIcon,
  GrenadianIcon,
  DominicaIcon,
  AntigianIcon,
  KittitianIcon,
  BahamianIcon,
  BrazilianIcon,
  ArgentineIcon,
  ChileanIcon,
  PeruvianIcon,
  EcuadorianIcon,
  ColombiaIcon,
  VenezuelanIcon,
  GuyaneseIcon,
  SurinameIcon,
  UruguaynIcon,
  ParaguayaIcon,
  BolivianIcon,
  SouthAfricanIcon,
  NamibianIcon,
  BotswanaIcon,
  ZimbaweanIcon,
  ZambiaIcon,
  MalawiaIcon,
  MozambicanIcon,
  MadagascarIcon,
  MauritianIcon,
  SeychellesIcon,
  ComoroIcon,
  MayotteIcon,
  ReunionIcon,
  MauritanianIcon,
  SenegaleseIcon,
  GambianIcon,
  BurkinaIcon,
  MalianIcon,
  NigerIcon,
  ChadianIcon,
  SudaneseIcon,
  EthiopianIcon,
  EritreanIcon,
  DjiboutianIcon,
  SomaliIcon,
  KenyanIcon,
  TanzanianIcon,
  UgandanIcon,
  RwandanIcon,
  BurundianIcon,
  CongolesIcon,
  AngolaidIcon,
  CameroonianIcon,
  EquatorialIcon,
  GaboneseIcon,
  SaoTomeIcon,
  NigerianIcon,
  BeninIcon,
  TogolesIcon,
  GhanaianIcon,
  IvorianIcon,
  LiberianIcon,
  SierraIcon,
  GuineanIcon,
  GuineaBissauIcon,
  CapeverdianIcon,
  MoroccanIcon,
  AlgerianIcon,
  TunisianIcon,
  LibyanIcon,
  EgyptianIcon
} from '@heroicons/react/24/outline';

// Types
interface AdminConfig {
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    lastCheck: string;
    services: {
      database: 'online' | 'offline' | 'warning';
      api: 'online' | 'offline' | 'warning';
      auth: 'online' | 'offline' | 'warning';
      storage: 'online' | 'offline' | 'warning';
      monitoring: 'online' | 'offline' | 'warning';
    };
  };
  metrics: {
    autoRefresh: boolean;
    refreshInterval: number;
    retentionPeriod: number;
    aggregationLevel: 'minute' | 'hour' | 'day' | 'week';
    enableAlerts: boolean;
    alertThresholds: {
      errorRate: number;
      responseTime: number;
      diskUsage: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  };
  users: {
    defaultRole: 'user' | 'admin' | 'manager';
    allowSelfRegistration: boolean;
    requireEmailVerification: boolean;
    enableMFA: boolean;
    sessionTimeout: number;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
      expirationDays: number;
    };
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    slackEnabled: boolean;
    webhookEnabled: boolean;
    channels: {
      system: boolean;
      security: boolean;
      business: boolean;
      user: boolean;
    };
  };
  security: {
    rateLimiting: {
      enabled: boolean;
      requestsPerMinute: number;
      burstLimit: number;
    };
    ipWhitelist: string[];
    ipBlacklist: string[];
    enableAuditLog: boolean;
    enableSecurityHeaders: boolean;
    requireHttps: boolean;
    enableCors: boolean;
    allowedOrigins: string[];
  };
  integrations: {
    zoho: {
      enabled: boolean;
      apiKey: string;
      webhookUrl: string;
      syncInterval: number;
    };
    slack: {
      enabled: boolean;
      botToken: string;
      channel: string;
    };
    email: {
      provider: 'sendgrid' | 'mailgun' | 'ses' | 'smtp';
      apiKey: string;
      fromEmail: string;
      fromName: string;
    };
  };
  backup: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    retentionDays: number;
    includeFiles: boolean;
    includeDatabase: boolean;
    cloudProvider: 'aws' | 'gcp' | 'azure' | 'local';
  };
}

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin' | 'manager';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLogin: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  avatar?: string;
  organizations: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  permissions: string[];
  metadata: Record<string, any>;
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, any>;
}

interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  unit: string;
  enabled: boolean;
  threshold?: {
    warning: number;
    critical: number;
  };
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
  retention: number;
  tags: string[];
}

// Component props
interface AdminControlPanelProps {
  initialConfig?: Partial<AdminConfig>;
  onConfigUpdate?: (config: AdminConfig) => void;
  onUserAction?: (action: string, userId: string, data?: any) => void;
  onSystemAction?: (action: string, data?: any) => void;
  canManageUsers?: boolean;
  canManageSystem?: boolean;
  canViewLogs?: boolean;
  canManageIntegrations?: boolean;
}

// System Health Component
const SystemHealthPanel: React.FC<{
  health: AdminConfig['systemHealth'];
  onRefresh: () => void;
  isRefreshing: boolean;
}> = ({ health, onRefresh, isRefreshing }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
      case 'offline':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'critical':
      case 'offline':
        return <XCircleIcon className="h-4 w-4" />;
      default:
        return <InformationCircleIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          title="Refresh health status"
        >
          <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Overall Status */}
      <div className="mb-6">
        <div className={`flex items-center space-x-2 p-3 rounded-lg ${getStatusColor(health.status)}`}>
          {getStatusIcon(health.status)}
          <span className="font-medium">
            System {health.status === 'healthy' ? 'Healthy' : health.status === 'warning' ? 'Warning' : 'Critical'}
          </span>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Uptime: {Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m
        </div>
        <div className="text-sm text-gray-600">
          Last check: {new Date(health.lastCheck).toLocaleString()}
        </div>
      </div>

      {/* Service Status */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Services</h4>
        {Object.entries(health.services).map(([service, status]) => (
          <div key={service} className="flex items-center justify-between">
            <span className="text-sm text-gray-700 capitalize">{service}</span>
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
              {getStatusIcon(status)}
              <span className="capitalize">{status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Metrics Configuration Component
const MetricsConfigPanel: React.FC<{
  config: AdminConfig['metrics'];
  onUpdate: (config: AdminConfig['metrics']) => void;
}> = ({ config, onUpdate }) => {
  const [localConfig, setLocalConfig] = useState(config);
  const [isDirty, setIsDirty] = useState(false);

  const handleChange = (key: keyof AdminConfig['metrics'], value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    setIsDirty(true);
  };

  const handleThresholdChange = (key: keyof AdminConfig['metrics']['alertThresholds'], value: number) => {
    const newConfig = {
      ...localConfig,
      alertThresholds: {
        ...localConfig.alertThresholds,
        [key]: value,
      },
    };
    setLocalConfig(newConfig);
    setIsDirty(true);
  };

  const handleSave = () => {
    onUpdate(localConfig);
    setIsDirty(false);
  };

  const handleReset = () => {
    setLocalConfig(config);
    setIsDirty(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Metrics Configuration</h3>
        <div className="flex items-center space-x-2">
          {isDirty && (
            <>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">General Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={localConfig.autoRefresh}
                  onChange={(e) => handleChange('autoRefresh', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Auto Refresh</span>
              </label>
            </div>
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={localConfig.enableAlerts}
                  onChange={(e) => handleChange('enableAlerts', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Enable Alerts</span>
              </label>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Refresh Interval (seconds)</label>
              <input
                type="number"
                value={localConfig.refreshInterval}
                onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                min="1"
                max="3600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Retention Period (days)</label>
              <input
                type="number"
                value={localConfig.retentionPeriod}
                onChange={(e) => handleChange('retentionPeriod', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                min="1"
                max="365"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Aggregation Level</label>
              <select
                value={localConfig.aggregationLevel}
                onChange={(e) => handleChange('aggregationLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="minute">Minute</option>
                <option value="hour">Hour</option>
                <option value="day">Day</option>
                <option value="week">Week</option>
              </select>
            </div>
          </div>
        </div>

        {/* Alert Thresholds */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Alert Thresholds</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Error Rate (%)</label>
              <input
                type="number"
                value={localConfig.alertThresholds.errorRate}
                onChange={(e) => handleThresholdChange('errorRate', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Response Time (ms)</label>
              <input
                type="number"
                value={localConfig.alertThresholds.responseTime}
                onChange={(e) => handleThresholdChange('responseTime', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Disk Usage (%)</label>
              <input
                type="number"
                value={localConfig.alertThresholds.diskUsage}
                onChange={(e) => handleThresholdChange('diskUsage', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Memory Usage (%)</label>
              <input
                type="number"
                value={localConfig.alertThresholds.memoryUsage}
                onChange={(e) => handleThresholdChange('memoryUsage', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">CPU Usage (%)</label>
              <input
                type="number"
                value={localConfig.alertThresholds.cpuUsage}
                onChange={(e) => handleThresholdChange('cpuUsage', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// User Management Component
const UserManagementPanel: React.FC<{
  users: User[];
  onUserAction: (action: string, userId: string, data?: any) => void;
  canManageUsers: boolean;
}> = ({ users, onUserAction, canManageUsers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showNewUserModal, setShowNewUserModal] = useState(false);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, filterRole, filterStatus]);

  const handleBulkAction = (action: string) => {
    selectedUsers.forEach(userId => {
      onUserAction(action, userId);
    });
    setSelectedUsers([]);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
        {canManageUsers && (
          <button
            onClick={() => setShowNewUserModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <UserPlusIcon className="h-4 w-4" />
            <span>Add User</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="user">User</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        {selectedUsers.length > 0 && canManageUsers && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleBulkAction('activate')}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Activate
            </button>
            <button
              onClick={() => handleBulkAction('suspend')}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Suspend
            </button>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {canManageUsers && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(filteredUsers.map(u => u.id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                {canManageUsers && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        }
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {user.avatar ? (
                        <img className="h-10 w-10 rounded-full" src={user.avatar} alt="" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUserAction('view', user.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    {canManageUsers && (
                      <>
                        <button
                          onClick={() => onUserAction('edit', user.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onUserAction('delete', user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8">
          <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-500">
            {searchTerm || filterRole !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'No users have been added yet'
            }
          </p>
        </div>
      )}
    </div>
  );
};

// System Alerts Component
const SystemAlertsPanel: React.FC<{
  alerts: SystemAlert[];
  onAcknowledge: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
}> = ({ alerts, onAcknowledge, onDismiss }) => {
  const getAlertIcon = (type: SystemAlert['type']) => {
    switch (type) {
      case 'error': return <XCircleIcon className="h-5 w-5" />;
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'info': return <InformationCircleIcon className="h-5 w-5" />;
      case 'success': return <CheckCircleIcon className="h-5 w-5" />;
      default: return <InformationCircleIcon className="h-5 w-5" />;
    }
  };

  const getAlertColor = (type: SystemAlert['type']) => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);
  const acknowledgedAlerts = alerts.filter(alert => alert.acknowledged);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">System Alerts</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {unacknowledgedAlerts.length} unacknowledged
          </span>
          <BellIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Unacknowledged Alerts */}
        {unacknowledgedAlerts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Alerts</h4>
            <div className="space-y-2">
              {unacknowledgedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${getAlertColor(alert.type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <h5 className="text-sm font-medium">{alert.title}</h5>
                        <p className="text-sm opacity-90 mt-1">{alert.message}</p>
                        <div className="flex items-center space-x-2 mt-2 text-xs opacity-75">
                          <span>{alert.source}</span>
                          <span>•</span>
                          <span>{new Date(alert.timestamp).toLocaleString()}</span>
                          <span>•</span>
                          <span className="capitalize">{alert.severity}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onAcknowledge(alert.id)}
                        className="p-1 hover:bg-white hover:bg-opacity-50 rounded"
                        title="Acknowledge"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDismiss(alert.id)}
                        className="p-1 hover:bg-white hover:bg-opacity-50 rounded"
                        title="Dismiss"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acknowledged Alerts */}
        {acknowledgedAlerts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Acknowledged</h4>
            <div className="space-y-2">
              {acknowledgedAlerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg bg-gray-50 border border-gray-200 opacity-75"
                >
                  <div className="flex items-start space-x-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-gray-700">{alert.title}</h5>
                      <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                        <span>{alert.source}</span>
                        <span>•</span>
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {alerts.length === 0 && (
          <div className="text-center py-8">
            <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts</h3>
            <p className="text-gray-500">All systems are running normally</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Admin Control Panel Component
export const AdminControlPanel: React.FC<AdminControlPanelProps> = ({
  initialConfig,
  onConfigUpdate,
  onUserAction,
  onSystemAction,
  canManageUsers = true,
  canManageSystem = true,
  canViewLogs = true,
  canManageIntegrations = true,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'metrics' | 'security' | 'integrations' | 'logs'>('overview');
  const [config, setConfig] = useState<AdminConfig>({
    systemHealth: {
      status: 'healthy',
      uptime: 3456789,
      lastCheck: new Date().toISOString(),
      services: {
        database: 'online',
        api: 'online',
        auth: 'online',
        storage: 'online',
        monitoring: 'online',
      },
    },
    metrics: {
      autoRefresh: true,
      refreshInterval: 30,
      retentionPeriod: 90,
      aggregationLevel: 'hour',
      enableAlerts: true,
      alertThresholds: {
        errorRate: 5.0,
        responseTime: 1000,
        diskUsage: 85,
        memoryUsage: 80,
        cpuUsage: 75,
      },
    },
    users: {
      defaultRole: 'user',
      allowSelfRegistration: true,
      requireEmailVerification: true,
      enableMFA: false,
      sessionTimeout: 3600,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: false,
        expirationDays: 90,
      },
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      slackEnabled: false,
      webhookEnabled: false,
      channels: {
        system: true,
        security: true,
        business: true,
        user: false,
      },
    },
    security: {
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 100,
        burstLimit: 200,
      },
      ipWhitelist: [],
      ipBlacklist: [],
      enableAuditLog: true,
      enableSecurityHeaders: true,
      requireHttps: true,
      enableCors: true,
      allowedOrigins: ['https://iocframework.com'],
    },
    integrations: {
      zoho: {
        enabled: true,
        apiKey: '',
        webhookUrl: '',
        syncInterval: 3600,
      },
      slack: {
        enabled: false,
        botToken: '',
        channel: '',
      },
      email: {
        provider: 'sendgrid',
        apiKey: '',
        fromEmail: 'noreply@iocframework.com',
        fromName: 'IOC Framework',
      },
    },
    backup: {
      enabled: true,
      frequency: 'daily',
      retentionDays: 30,
      includeFiles: true,
      includeDatabase: true,
      cloudProvider: 'aws',
    },
    ...initialConfig,
  });

  const [users] = useState<User[]>([
    {
      id: '1',
      email: 'admin@iocframework.com',
      fullName: 'System Administrator',
      role: 'admin',
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      lastLogin: '2024-01-10T10:30:00Z',
      emailVerified: true,
      mfaEnabled: true,
      organizations: [],
      permissions: ['*'],
      metadata: {},
    },
    {
      id: '2',
      email: 'manager@iocframework.com',
      fullName: 'Team Manager',
      role: 'manager',
      status: 'active',
      createdAt: '2024-01-02T00:00:00Z',
      lastLogin: '2024-01-10T09:15:00Z',
      emailVerified: true,
      mfaEnabled: false,
      organizations: [],
      permissions: ['read', 'write', 'manage_users'],
      metadata: {},
    },
    {
      id: '3',
      email: 'user@iocframework.com',
      fullName: 'Regular User',
      role: 'user',
      status: 'active',
      createdAt: '2024-01-03T00:00:00Z',
      lastLogin: '2024-01-09T14:22:00Z',
      emailVerified: true,
      mfaEnabled: false,
      organizations: [],
      permissions: ['read'],
      metadata: {},
    },
  ]);

  const [alerts] = useState<SystemAlert[]>([
    {
      id: '1',
      type: 'warning',
      title: 'High Memory Usage',
      message: 'Memory usage has exceeded 85% threshold',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      acknowledged: false,
      source: 'System Monitor',
      severity: 'medium',
    },
    {
      id: '2',
      type: 'info',
      title: 'Backup Completed',
      message: 'Daily backup completed successfully',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      acknowledged: true,
      source: 'Backup Service',
      severity: 'low',
    },
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleConfigUpdate = (newConfig: AdminConfig) => {
    setConfig(newConfig);
    onConfigUpdate?.(newConfig);
  };

  const handleRefreshHealth = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleUserAction = (action: string, userId: string, data?: any) => {
    onUserAction?.(action, userId, data);
  };

  const handleSystemAction = (action: string, data?: any) => {
    onSystemAction?.(action, data);
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    // Update alert status
    console.log('Acknowledging alert:', alertId);
  };

  const handleDismissAlert = (alertId: string) => {
    // Remove alert
    console.log('Dismissing alert:', alertId);
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'users', name: 'Users', icon: UsersIcon, disabled: !canManageUsers },
    { id: 'metrics', name: 'Metrics', icon: CpuChipIcon, disabled: !canManageSystem },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon, disabled: !canManageSystem },
    { id: 'integrations', name: 'Integrations', icon: CloudIcon, disabled: !canManageIntegrations },
    { id: 'logs', name: 'Logs', icon: DocumentTextIcon, disabled: !canViewLogs },
  ].filter(tab => !tab.disabled);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Admin Control Panel</h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                System Status: 
                <span className={`ml-1 font-medium ${
                  config.systemHealth.status === 'healthy' ? 'text-green-600' :
                  config.systemHealth.status === 'warning' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {config.systemHealth.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemHealthPanel
              health={config.systemHealth}
              onRefresh={handleRefreshHealth}
              isRefreshing={isRefreshing}
            />
            <SystemAlertsPanel
              alerts={alerts}
              onAcknowledge={handleAcknowledgeAlert}
              onDismiss={handleDismissAlert}
            />
          </div>
        )}

        {activeTab === 'users' && canManageUsers && (
          <UserManagementPanel
            users={users}
            onUserAction={handleUserAction}
            canManageUsers={canManageUsers}
          />
        )}

        {activeTab === 'metrics' && canManageSystem && (
          <MetricsConfigPanel
            config={config.metrics}
            onUpdate={(metricsConfig) => handleConfigUpdate({ ...config, metrics: metricsConfig })}
          />
        )}

        {activeTab === 'security' && canManageSystem && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Configuration</h3>
            <p className="text-gray-600">Security settings panel coming soon...</p>
          </div>
        )}

        {activeTab === 'integrations' && canManageIntegrations && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Settings</h3>
            <p className="text-gray-600">Integration management panel coming soon...</p>
          </div>
        )}

        {activeTab === 'logs' && canViewLogs && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Logs</h3>
            <p className="text-gray-600">Log viewer coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminControlPanel;