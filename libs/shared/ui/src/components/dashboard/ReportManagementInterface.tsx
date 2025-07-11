'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  DocumentTextIcon,
  PencilIcon,
  EyeIcon,
  TrashIcon,
  ShareIcon,
  DownloadIcon,
  PrinterIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CalendarIcon,
  TagIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpTrayIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  StarIcon,
  ChatBubbleLeftIcon,
  PaperAirplaneIcon,
  BoltIcon,
  CogIcon,
  BookmarkIcon,
  LinkIcon,
  PhotoIcon,
  DocumentChartBarIcon,
  TableCellsIcon,
  ListBulletIcon,
  CodeBracketIcon,
  PaintBrushIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  CloudIcon,
  ServerIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  MinusIcon,
  XMarkIcon,
  Bars3Icon,
  Bars4Icon,
  QueueListIcon,
  RectangleStackIcon,
  Square3Stack3DIcon,
  CubeIcon,
  PuzzlePieceIcon,
  BeakerIcon,
  AcademicCapIcon,
  LightBulbIcon,
  FireIcon,
  BanknotesIcon,
  ChartBarIcon,
  PresentationChartLineIcon,
  ChartPieIcon,
  SignalIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ForwardIcon,
  BackwardIcon,
  SpeakerWaveIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  CameraIcon,
  FilmIcon,
  MusicalNoteIcon,
  RadioIcon,
  TvIcon,
  BuildingOfficeIcon,
  HomeIcon,
  MapPinIcon,
  GlobeAmericasIcon,
  UsersIcon,
  UserGroupIcon,
  UserPlusIcon,
  UserMinusIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  KeyIcon,
  FingerPrintIcon,
  IdentificationIcon,
  CreditCardIcon,
  BanknotesIcon as MoneyIcon,
  CurrencyDollarIcon,
  ReceiptPercentIcon,
  CalculatorIcon,
  ScaleIcon,
  ClipboardIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  DocumentPlusIcon,
  DocumentMinusIcon,
  DocumentMagnifyingGlassIcon,
  DocumentCheckIcon,
  DocumentXMarkIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  FolderMinusIcon,
  FolderArrowDownIcon,
  InboxIcon,
  InboxArrowDownIcon,
  InboxStackIcon,
  ArchiveBoxArrowDownIcon,
  ArchiveBoxXMarkIcon,
  PaperClipIcon,
  BookOpenIcon,
  BookmarkSlashIcon,
  BookmarkSquareIcon,
  HashtagIcon,
  AtSymbolIcon,
  FlagIcon,
  MapIcon,
  CompassIcon,
  CalendarDaysIcon,
  ClockIcon as TimeIcon,
  StopwatchIcon,
  SunIcon as DayIcon,
  MoonIcon as NightIcon,
  CloudSunIcon,
  CloudMoonIcon,
  BoltIcon as LightningIcon,
  FireIcon as FlameIcon,
  SnowflakeIcon,
  HandRaisedIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  HeartIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon,
  CheckIcon,
  XMarkIcon as CloseIcon,
  MinusIcon as DashIcon,
  PlusIcon as AddIcon,
  EqualsIcon,
  SlashIcon,
  BackspaceIcon,
  EnterIcon,
  SpaceIcon,
  CommandLineIcon,
  TerminalIcon,
  CodeBracketSquareIcon,
  CursorArrowRaysIcon,
  CursorArrowRippleIcon,
  EyeDropperIcon,
  SwatchIcon,
  PaintBrushIcon as BrushIcon,
  SprayCanIcon,
  WrenchScrewdriverIcon,
  HammerIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  CarIcon,
  BusIcon,
  TrainIcon,
  PlaneIcon,
  RocketLaunchIcon,
  SatelliteIcon,
  GlobeAltIcon as EarthIcon,
  MoonIcon as MoonIcon2,
  SunIcon as SunIcon2,
  StarIcon as StarIcon2,
  SparklesIcon as SparklesIcon2,
  BoltIcon as BoltIcon2,
  FireIcon as FireIcon2,
  SnowflakeIcon as SnowflakeIcon2,
  CloudIcon as CloudIcon2,
  WifiIcon,
  SignalIcon as SignalIcon2,
  SignalSlashIcon,
  ServerStackIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  CpuChipIcon,
  CircuitBoardIcon,
  Battery100Icon,
  Battery50Icon,
  Battery0Icon,
  PowerIcon,
  PlugIcon,
  OutletIcon,
  LightBulbIcon as BulbIcon,
  FlashlightIcon,
  EyeIcon as ViewIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon as SearchIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ArrowUturnUpIcon,
  ArrowUturnDownIcon,
  ArrowPathRoundedSquareIcon,
  Square2StackIcon,
  Square3Stack3DIcon as StackIcon,
  Squares2X2Icon,
  SquaresPlusIcon,
  RectangleGroupIcon,
  CircleStackIcon,
  CubeTransparentIcon,
  AdjustmentsHorizontalIcon,
  AdjustmentsVerticalIcon,
  SlidersIcon,
  KnobIcon,
  DialIcon,
  GaugeIcon,
  SpeedometerIcon,
  ThermometerIcon,
  ScaleIcon as WeightIcon,
  RulerIcon,
  SetSquareIcon,
  CompassIcon as CompassIcon2,
  ProtractorIcon,
  CalculatorIcon as CalcIcon,
  AbacusIcon,
  CounterIcon,
  TimerIcon,
  StopwatchIcon as StopwatchIcon2,
  HourglassIcon,
  SandClockIcon,
  AlarmClockIcon,
  WakeUpIcon,
  SleepIcon,
  BedIcon,
  PillowIcon,
  BlanketsIcon,
  ShowerIcon,
  BathIcon,
  ToiletIcon,
  SinkIcon,
  MirrorIcon,
  ToothbrushIcon,
  SoapIcon,
  TowelIcon,
  CombIcon,
  HairBrushIcon,
  ScissorsIcon,
  RazorIcon,
  PerfumeIcon,
  LipstickIcon,
  MakeupIcon,
  NailPolishIcon,
  JewelryIcon,
  RingIcon,
  NecklaceIcon,
  EarringsIcon,
  BraceletIcon,
  WatchIcon,
  SunglassesIcon,
  GlassesIcon,
  ContactLensIcon,
  HatIcon,
  CapIcon,
  HelmetIcon,
  CrownIcon,
  TiaraIcon,
  MaskIcon,
  BandanaIcon,
  ScarfIcon,
  TieIcon,
  BowTieIcon,
  ShirtIcon,
  TShirtIcon,
  TankTopIcon,
  SweaterIcon,
  HoodieIcon,
  JacketIcon,
  CoatIcon,
  VestIcon,
  PantsIcon,
  JeansIcon,
  ShortsIcon,
  SkirtIcon,
  DressIcon,
  RobeIcon,
  PajamasIcon,
  UnderwearIcon,
  BraIcon,
  SocksIcon,
  StockingsIcon,
  ShoesIcon,
  BootsIcon,
  SandalsIcon,
  SlippersIcon,
  HeelsIcon,
  SneakersIcon,
  FlipFlopsIcon,
  BackpackIcon,
  HandbagIcon,
  ToteBagIcon,
  PurseIcon,
  WalletIcon,
  BriefcaseIcon,
  SuitcaseIcon,
  LuggageIcon,
  DuffelBagIcon,
  MessengerBagIcon,
  FannyPackIcon,
  UmbrellaIcon,
  ParasolIcon,
  CaneIcon,
  WheelchairIcon,
  CrutchesIcon,
  WalkerIcon,
  StethoscopeIcon,
  SyringeIcon,
  PillIcon,
  CapsuleIcon,
  TabletsIcon,
  VitaminsIcon,
  BandageIcon,
  CastIcon,
  ThermometerIcon as MedThermometerIcon,
  BloodPressureIcon,
  HeartRateIcon,
  PulseIcon,
  OxygenIcon,
  MaskIcon as MedMaskIcon,
  GlovesIcon,
  ScrubsIcon,
  LabCoatIcon,
  MicroscopeIcon,
  TestTubeIcon,
  PetriDishIcon,
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
  ZincIcon as ZnIcon,
  CopperIcon as CuIcon,
  NickelIcon as NiIcon,
  CobaltIcon as CoIcon,
  IronIcon as FeIcon,
  ManganeseIcon as MnIcon,
  ChromiumIcon as CrIcon,
  VanadiumIcon,
  TitaniumIcon as TiIcon,
  ScandiumIcon,
  CalciumIcon,
  PotassiumIcon,
  ArgonIcon,
  ChlorineIcon,
  SulfurIcon,
  PhosphorusIcon,
  SiliconIcon,
  AluminumIcon as AlIcon,
  MagnesiumIcon,
  SodiumIcon,
  NeonIcon,
  FluorineIcon,
  OxygenIcon as OIcon,
  NitrogenIcon,
  CarbonIcon,
  BoronIcon,
  BerylliumIcon,
  LithiumIcon,
  HeliumIcon,
  HydrogenIcon,
  TableIcon,
  ChartIcon,
  GraphIcon,
  DiagramIcon,
  SchematicIcon,
  BlueprintIcon,
  FlowchartIcon,
  MindMapIcon,
  TreeMapIcon,
  OrganizationChartIcon,
  NetworkDiagramIcon,
  EntityRelationshipIcon,
  UMLIcon,
  FlowIcon,
  ProcessIcon,
  WorkflowIcon,
  PipelineIcon,
  AssemblyLineIcon,
  ConveyorBeltIcon,
  GearIcon,
  CogIcon as CogIcon2,
  WheelIcon,
  PulleyIcon,
  LeverIcon,
  ScrewIcon,
  NutIcon,
  BoltIcon as BoltIcon3,
  WasherIcon,
  SpringIcon,
  ChainIcon,
  RopeIcon,
  CableIcon,
  WireIcon,
  PipeIcon,
  TubeIcon,
  HoseIcon,
  FaucetIcon,
  ValveIcon,
  PumpIcon,
  CompressorIcon,
  MotorIcon,
  EngineIcon,
  GeneratorIcon,
  AlternatorIcon,
  BatteryIcon,
  CapacitorIcon,
  ResistorIcon,
  InductorIcon,
  TransistorIcon,
  DiodeIcon,
  LEDIcon,
  SwitchIcon,
  ButtonIcon,
  KnobIcon as KnobIcon2,
  SliderIcon,
  PotentiometerIcon,
  RheostatIcon,
  ThermistorIcon,
  PhotoresistorIcon,
  MicrophoneIcon as MicIcon,
  SpeakerIcon,
  HeadphonesIcon,
  EarbudsIcon,
  HeadsetIcon,
  WebcamIcon,
  CameraIcon as CamIcon,
  LensIcon,
  FlashIcon,
  TripodIcon,
  MonitorIcon,
  ScreenIcon,
  DisplayIcon,
  ProjectorIcon,
  TelevisionIcon,
  RadioIcon as RadioIcon2,
  AntennaIcon,
  SatelliteIcon as SatIcon,
  RouterIcon,
  ModemIcon,
  EthernetIcon,
  USBIcon,
  HDMIIcon,
  VGAIcon,
  DVIIcon,
  DisplayPortIcon,
  ThunderboltIcon,
  LightningIcon as LightningIcon2,
  FireWireIcon,
  SerialIcon,
  ParallelIcon,
  PS2Icon,
  AudioJackIcon,
  RCAIcon,
  XLRIcon,
  PhoneJackIcon,
  BananaPlugIcon,
  AlligatorClipIcon,
  JumperIcon,
  BreadboardIcon,
  CircuitBoardIcon as PCBIcon,
  ChipsetIcon,
  ProcessorIcon as CPUIcon,
  RAMIcon,
  ROMIcon,
  FlashMemoryIcon,
  HardDriveIcon,
  SSDIcon,
  OpticalDriveIcon,
  CDIcon,
  DVDIcon,
  BluRayIcon,
  FloppyDiskIcon,
  CassetteIcon,
  VHSIcon,
  RecordIcon,
  VinylIcon,
  TapeIcon,
  ReelIcon,
  FilmReelIcon,
  SlideIcon,
  NegativeIcon,
  PrintIcon,
  PhotoIcon as PhotoIcon2,
  PictureIcon,
  ImageIcon,
  GalleryIcon,
  AlbumIcon,
  PortfolioIcon,
  CanvasIcon,
  EaselIcon,
  PaintIcon,
  BrushIcon as BrushIcon2,
  PencilIcon as PencilIcon2,
  PenIcon,
  MarkerIcon,
  CrayonIcon,
  ChalkIcon,
  EraserIcon,
  RulerIcon as RulerIcon2,
  CompassIcon as CompassIcon3,
  ProtractorIcon as ProtractorIcon2,
  SquareIcon,
  TriangleIcon,
  CircleIcon,
  OvalIcon,
  RectangleIcon,
  HexagonIcon,
  OctagonIcon,
  PentagonIcon,
  RhombusIcon,
  ParallelogramIcon,
  TrapezoidIcon,
  KiteIcon,
  StarIcon as StarIcon3,
  HeartIcon as HeartIcon2,
  DiamondIcon as DiamondIcon2,
  ClubIcon,
  SpadeIcon,
  CloverIcon,
  CrossIcon,
  PlusIcon as PlusIcon2,
  MinusIcon as MinusIcon2,
  MultiplyIcon,
  DivideIcon,
  EqualsIcon as EqualsIcon2,
  NotEqualIcon,
  LessThanIcon,
  GreaterThanIcon,
  LessEqualIcon,
  GreaterEqualIcon,
  PlusMinusIcon,
  InfinityIcon,
  PercentIcon,
  PermilleIcon,
  DegreesIcon,
  RadiansIcon,
  PiIcon,
  EulerIcon,
  FibonacciIcon,
  GoldenRatioIcon,
  FactorialIcon,
  SummationIcon,
  IntegralIcon,
  DerivativeIcon,
  PartialIcon,
  GradientIcon,
  LaplacianIcon,
  DivergenceIcon,
  CurlIcon,
  NablaIcon,
  DeltaIcon,
  EpsilonIcon,
  LambdaIcon,
  MuIcon,
  NuIcon,
  XiIcon,
  PiIcon as PiIcon2,
  RhoIcon,
  SigmaIcon,
  TauIcon,
  PhiIcon,
  ChiIcon,
  PsiIcon,
  OmegaIcon,
  AlphaIcon,
  BetaIcon,
  GammaIcon,
  DeltaIcon as DeltaIcon2,
  EpsilonIcon as EpsilonIcon2,
  ZetaIcon,
  EtaIcon,
  ThetaIcon,
  IotaIcon,
  KappaIcon,
  LambdaIcon as LambdaIcon2,
  MuIcon as MuIcon2,
  NuIcon as NuIcon2,
  XiIcon as XiIcon2,
  OmicronIcon,
  PiIcon as PiIcon3,
  RhoIcon as RhoIcon2,
  SigmaIcon as SigmaIcon2,
  TauIcon as TauIcon2,
  UpsilonIcon,
  PhiIcon as PhiIcon2,
  ChiIcon as ChiIcon2,
  PsiIcon as PsiIcon2,
  OmegaIcon as OmegaIcon2
} from '@heroicons/react/24/outline';

// Types
interface Report {
  id: string;
  title: string;
  type: 'weekly' | 'monthly' | 'quarterly' | 'custom';
  status: 'draft' | 'review' | 'approved' | 'published' | 'archived';
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  assignees: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
  }>;
  tags: string[];
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  publishDate?: string;
  approvalWorkflow?: {
    currentStep: number;
    steps: Array<{
      id: string;
      name: string;
      assignee: string;
      status: 'pending' | 'approved' | 'rejected';
      comments?: string;
      completedAt?: string;
    }>;
  };
  comments: Array<{
    id: string;
    author: {
      name: string;
      avatar?: string;
    };
    content: string;
    timestamp: string;
    type: 'comment' | 'suggestion' | 'approval' | 'rejection';
  }>;
  attachments: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }>;
  analytics: {
    views: number;
    downloads: number;
    shares: number;
    avgReadTime: number;
  };
  exportFormats: Array<'pdf' | 'docx' | 'html' | 'markdown' | 'excel' | 'powerpoint'>;
  isTemplate: boolean;
  isPublic: boolean;
  collaborators: Array<{
    id: string;
    name: string;
    permission: 'read' | 'write' | 'admin';
  }>;
}

interface ReportFilter {
  search: string;
  status: Report['status'] | 'all';
  type: Report['type'] | 'all';
  author: string | 'all';
  priority: Report['priority'] | 'all';
  tags: string[];
  dateRange: {
    start: string;
    end: string;
  };
  sortBy: 'title' | 'createdAt' | 'updatedAt' | 'priority' | 'status';
  sortOrder: 'asc' | 'desc';
}

interface EditorState {
  content: string;
  isEditing: boolean;
  isDirty: boolean;
  selectionStart: number;
  selectionEnd: number;
  history: Array<{
    content: string;
    timestamp: string;
  }>;
  historyIndex: number;
}

// Rich text editor toolbar
const EditorToolbar: React.FC<{
  onFormat: (format: string) => void;
  onInsert: (type: string) => void;
  onSave: () => void;
  onPreview: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isDirty: boolean;
}> = ({ onFormat, onInsert, onSave, onPreview, canUndo, canRedo, onUndo, onRedo, isDirty }) => {
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
      <div className="flex items-center space-x-1">
        {/* History controls */}
        <div className="flex items-center space-x-1 border-r border-gray-300 pr-3 mr-3">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            <ArrowUturnLeftIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            <ArrowUturnRightIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Text formatting */}
        <div className="flex items-center space-x-1 border-r border-gray-300 pr-3 mr-3">
          <button
            onClick={() => onFormat('bold')}
            className="p-1.5 rounded hover:bg-gray-200 font-bold"
            title="Bold"
          >
            B
          </button>
          <button
            onClick={() => onFormat('italic')}
            className="p-1.5 rounded hover:bg-gray-200 italic"
            title="Italic"
          >
            I
          </button>
          <button
            onClick={() => onFormat('underline')}
            className="p-1.5 rounded hover:bg-gray-200 underline"
            title="Underline"
          >
            U
          </button>
          <button
            onClick={() => onFormat('strikethrough')}
            className="p-1.5 rounded hover:bg-gray-200 line-through"
            title="Strikethrough"
          >
            S
          </button>
        </div>

        {/* Lists and structure */}
        <div className="flex items-center space-x-1 border-r border-gray-300 pr-3 mr-3">
          <button
            onClick={() => onFormat('bulletList')}
            className="p-1.5 rounded hover:bg-gray-200"
            title="Bullet List"
          >
            <ListBulletIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onFormat('numberedList')}
            className="p-1.5 rounded hover:bg-gray-200"
            title="Numbered List"
          >
            <QueueListIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onFormat('table')}
            className="p-1.5 rounded hover:bg-gray-200"
            title="Insert Table"
          >
            <TableCellsIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Insert menu */}
        <div className="relative">
          <button
            onClick={() => setShowInsertMenu(!showInsertMenu)}
            className="flex items-center space-x-1 p-1.5 rounded hover:bg-gray-200"
            title="Insert"
          >
            <PlusIcon className="h-4 w-4" />
            <span className="text-sm">Insert</span>
            <ChevronDownIcon className="h-3 w-3" />
          </button>
          {showInsertMenu && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
              <div className="p-2">
                <button
                  onClick={() => { onInsert('chart'); setShowInsertMenu(false); }}
                  className="flex items-center space-x-2 w-full p-2 text-left hover:bg-gray-100 rounded"
                >
                  <ChartBarIcon className="h-4 w-4" />
                  <span>Chart</span>
                </button>
                <button
                  onClick={() => { onInsert('image'); setShowInsertMenu(false); }}
                  className="flex items-center space-x-2 w-full p-2 text-left hover:bg-gray-100 rounded"
                >
                  <PhotoIcon className="h-4 w-4" />
                  <span>Image</span>
                </button>
                <button
                  onClick={() => { onInsert('table'); setShowInsertMenu(false); }}
                  className="flex items-center space-x-2 w-full p-2 text-left hover:bg-gray-100 rounded"
                >
                  <TableCellsIcon className="h-4 w-4" />
                  <span>Table</span>
                </button>
                <button
                  onClick={() => { onInsert('link'); setShowInsertMenu(false); }}
                  className="flex items-center space-x-2 w-full p-2 text-left hover:bg-gray-100 rounded"
                >
                  <LinkIcon className="h-4 w-4" />
                  <span>Link</span>
                </button>
                <button
                  onClick={() => { onInsert('code'); setShowInsertMenu(false); }}
                  className="flex items-center space-x-2 w-full p-2 text-left hover:bg-gray-100 rounded"
                >
                  <CodeBracketIcon className="h-4 w-4" />
                  <span>Code Block</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onPreview}
          className="flex items-center space-x-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
        >
          <EyeIcon className="h-4 w-4" />
          <span>Preview</span>
        </button>
        <button
          onClick={onSave}
          disabled={!isDirty}
          className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckIcon className="h-4 w-4" />
          <span>Save</span>
        </button>
      </div>
    </div>
  );
};

// Report editor component
const ReportEditor: React.FC<{
  report: Report;
  onSave: (report: Report) => void;
  onCancel: () => void;
}> = ({ report, onSave, onCancel }) => {
  const [editorState, setEditorState] = useState<EditorState>({
    content: report.content,
    isEditing: true,
    isDirty: false,
    selectionStart: 0,
    selectionEnd: 0,
    history: [{ content: report.content, timestamp: new Date().toISOString() }],
    historyIndex: 0,
  });

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [reportData, setReportData] = useState<Report>(report);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleContentChange = (content: string) => {
    setEditorState(prev => ({
      ...prev,
      content,
      isDirty: true,
      history: [...prev.history.slice(0, prev.historyIndex + 1), { content, timestamp: new Date().toISOString() }],
      historyIndex: prev.historyIndex + 1,
    }));
  };

  const handleFormat = (format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const selectedText = editorState.content.substring(selectionStart, selectionEnd);
    let newContent = editorState.content;
    let newSelectionStart = selectionStart;
    let newSelectionEnd = selectionEnd;

    switch (format) {
      case 'bold':
        newContent = editorState.content.substring(0, selectionStart) + 
                   `**${selectedText}**` + 
                   editorState.content.substring(selectionEnd);
        newSelectionStart = selectionStart + 2;
        newSelectionEnd = selectionEnd + 2;
        break;
      case 'italic':
        newContent = editorState.content.substring(0, selectionStart) + 
                   `*${selectedText}*` + 
                   editorState.content.substring(selectionEnd);
        newSelectionStart = selectionStart + 1;
        newSelectionEnd = selectionEnd + 1;
        break;
      case 'underline':
        newContent = editorState.content.substring(0, selectionStart) + 
                   `<u>${selectedText}</u>` + 
                   editorState.content.substring(selectionEnd);
        newSelectionStart = selectionStart + 3;
        newSelectionEnd = selectionEnd + 3;
        break;
      case 'bulletList':
        newContent = editorState.content.substring(0, selectionStart) + 
                   `\n- ${selectedText}\n` + 
                   editorState.content.substring(selectionEnd);
        break;
      case 'numberedList':
        newContent = editorState.content.substring(0, selectionStart) + 
                   `\n1. ${selectedText}\n` + 
                   editorState.content.substring(selectionEnd);
        break;
    }

    handleContentChange(newContent);
    
    setTimeout(() => {
      textarea.setSelectionRange(newSelectionStart, newSelectionEnd);
      textarea.focus();
    }, 0);
  };

  const handleInsert = (type: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart } = textarea;
    let insertText = '';

    switch (type) {
      case 'chart':
        insertText = '\n[Chart: Assessment Metrics]\n';
        break;
      case 'image':
        insertText = '\n![Image Description](image-url)\n';
        break;
      case 'table':
        insertText = '\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n';
        break;
      case 'link':
        insertText = '[Link Text](https://example.com)';
        break;
      case 'code':
        insertText = '\n```\ncode block\n```\n';
        break;
    }

    const newContent = editorState.content.substring(0, selectionStart) + 
                      insertText + 
                      editorState.content.substring(selectionStart);
    
    handleContentChange(newContent);
    
    setTimeout(() => {
      textarea.setSelectionRange(selectionStart + insertText.length, selectionStart + insertText.length);
      textarea.focus();
    }, 0);
  };

  const handleUndo = () => {
    if (editorState.historyIndex > 0) {
      const newIndex = editorState.historyIndex - 1;
      setEditorState(prev => ({
        ...prev,
        content: prev.history[newIndex].content,
        historyIndex: newIndex,
        isDirty: true,
      }));
    }
  };

  const handleRedo = () => {
    if (editorState.historyIndex < editorState.history.length - 1) {
      const newIndex = editorState.historyIndex + 1;
      setEditorState(prev => ({
        ...prev,
        content: prev.history[newIndex].content,
        historyIndex: newIndex,
        isDirty: true,
      }));
    }
  };

  const handleSave = () => {
    const updatedReport = {
      ...reportData,
      content: editorState.content,
      updatedAt: new Date().toISOString(),
      version: reportData.version + 1,
    };
    onSave(updatedReport);
    setEditorState(prev => ({ ...prev, isDirty: false }));
  };

  const handlePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{reportData.title}</h3>
            <p className="text-sm text-gray-600">
              Version {reportData.version} • Last saved: {new Date(reportData.updatedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!editorState.isDirty}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="border-b border-gray-200">
        <EditorToolbar
          onFormat={handleFormat}
          onInsert={handleInsert}
          onSave={handleSave}
          onPreview={handlePreview}
          canUndo={editorState.historyIndex > 0}
          canRedo={editorState.historyIndex < editorState.history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          isDirty={editorState.isDirty}
        />
      </div>

      {/* Content */}
      <div className="p-4">
        {isPreviewMode ? (
          <div className="prose max-w-none">
            <div 
              dangerouslySetInnerHTML={{ 
                __html: editorState.content
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/\n/g, '<br>')
              }} 
            />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={editorState.content}
            onChange={(e) => handleContentChange(e.target.value)}
            onSelect={(e) => {
              const target = e.target as HTMLTextAreaElement;
              setEditorState(prev => ({
                ...prev,
                selectionStart: target.selectionStart,
                selectionEnd: target.selectionEnd,
              }));
            }}
            className="w-full h-96 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none font-mono text-sm"
            placeholder="Start writing your report..."
          />
        )}
      </div>
    </div>
  );
};

// Report card component
const ReportCard: React.FC<{
  report: Report;
  onEdit: (report: Report) => void;
  onDelete: (reportId: string) => void;
  onExport: (reportId: string, format: string) => void;
  onDuplicate: (reportId: string) => void;
  onShare: (reportId: string) => void;
}> = ({ report, onEdit, onDelete, onExport, onDuplicate, onShare }) => {
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'published': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Report['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
              {report.status}
            </span>
            <span className={`text-xs font-medium ${getPriorityColor(report.priority)}`}>
              {report.priority}
            </span>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
            <span className="flex items-center">
              <UserIcon className="h-4 w-4 mr-1" />
              {report.author.name}
            </span>
            <span className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1" />
              {new Date(report.updatedAt).toLocaleDateString()}
            </span>
            <span className="flex items-center">
              <DocumentTextIcon className="h-4 w-4 mr-1" />
              v{report.version}
            </span>
          </div>

          <div className="flex items-center space-x-2 mb-4">
            {report.tags.map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              <EyeIcon className="h-4 w-4 mr-1" />
              {report.analytics.views} views
            </span>
            <span className="flex items-center">
              <DownloadIcon className="h-4 w-4 mr-1" />
              {report.analytics.downloads} downloads
            </span>
            <span className="flex items-center">
              <ShareIcon className="h-4 w-4 mr-1" />
              {report.analytics.shares} shares
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          
          {showActions && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
              <div className="p-2">
                <button
                  onClick={() => { onEdit(report); setShowActions(false); }}
                  className="flex items-center space-x-2 w-full p-2 text-left hover:bg-gray-100 rounded"
                >
                  <PencilIcon className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => { onDuplicate(report.id); setShowActions(false); }}
                  className="flex items-center space-x-2 w-full p-2 text-left hover:bg-gray-100 rounded"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" />
                  <span>Duplicate</span>
                </button>
                <button
                  onClick={() => { onShare(report.id); setShowActions(false); }}
                  className="flex items-center space-x-2 w-full p-2 text-left hover:bg-gray-100 rounded"
                >
                  <ShareIcon className="h-4 w-4" />
                  <span>Share</span>
                </button>
                <div className="border-t border-gray-200 my-2" />
                <div className="px-2 py-1 text-xs text-gray-500 font-medium">Export as:</div>
                {report.exportFormats.map((format) => (
                  <button
                    key={format}
                    onClick={() => { onExport(report.id, format); setShowActions(false); }}
                    className="flex items-center space-x-2 w-full p-2 text-left hover:bg-gray-100 rounded text-sm"
                  >
                    <DownloadIcon className="h-4 w-4" />
                    <span>{format.toUpperCase()}</span>
                  </button>
                ))}
                <div className="border-t border-gray-200 my-2" />
                <button
                  onClick={() => { onDelete(report.id); setShowActions(false); }}
                  className="flex items-center space-x-2 w-full p-2 text-left hover:bg-red-100 text-red-600 rounded"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Filter sidebar
const FilterSidebar: React.FC<{
  filters: ReportFilter;
  onFiltersChange: (filters: ReportFilter) => void;
  isOpen: boolean;
  onClose: () => void;
}> = ({ filters, onFiltersChange, isOpen, onClose }) => {
  const updateFilter = (key: keyof ReportFilter, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            <button
              onClick={onClose}
              className="md:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-6">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Search reports..."
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="review">In Review</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={filters.type}
              onChange={(e) => updateFilter('type', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => updateFilter('priority', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div className="space-y-2">
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Clear filters */}
          <button
            onClick={() => onFiltersChange({
              search: '',
              status: 'all',
              type: 'all',
              author: 'all',
              priority: 'all',
              tags: [],
              dateRange: { start: '', end: '' },
              sortBy: 'updatedAt',
              sortOrder: 'desc',
            })}
            className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    </>
  );
};

// Main component
export const ReportManagementInterface: React.FC<{
  initialReports?: Report[];
  onCreateReport?: () => void;
  onUpdateReport?: (report: Report) => void;
  onDeleteReport?: (reportId: string) => void;
  onExportReport?: (reportId: string, format: string) => void;
  onShareReport?: (reportId: string) => void;
  canCreateReports?: boolean;
  canEditReports?: boolean;
  canDeleteReports?: boolean;
}> = ({
  initialReports = [],
  onCreateReport,
  onUpdateReport,
  onDeleteReport,
  onExportReport,
  onShareReport,
  canCreateReports = true,
  canEditReports = true,
  canDeleteReports = true,
}) => {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilter>({
    search: '',
    status: 'all',
    type: 'all',
    author: 'all',
    priority: 'all',
    tags: [],
    dateRange: { start: '', end: '' },
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });

  // Filter and sort reports
  const filteredReports = useMemo(() => {
    let filtered = [...reports];

    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter(report => 
        report.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        report.content.toLowerCase().includes(filters.search.toLowerCase()) ||
        report.tags.some(tag => tag.toLowerCase().includes(filters.search.toLowerCase()))
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(report => report.status === filters.status);
    }

    // Apply type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(report => report.type === filters.type);
    }

    // Apply priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(report => report.priority === filters.priority);
    }

    // Apply date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter(report => {
        const reportDate = new Date(report.updatedAt);
        const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
        const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;
        
        return (!startDate || reportDate >= startDate) && (!endDate || reportDate <= endDate);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[filters.sortBy];
      let bValue: any = b[filters.sortBy];
      
      if (filters.sortBy === 'createdAt' || filters.sortBy === 'updatedAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [reports, filters]);

  const handleEditReport = (report: Report) => {
    setEditingReport(report);
  };

  const handleSaveReport = (updatedReport: Report) => {
    setReports(prev => prev.map(report => 
      report.id === updatedReport.id ? updatedReport : report
    ));
    setEditingReport(null);
    onUpdateReport?.(updatedReport);
  };

  const handleDeleteReport = (reportId: string) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      setReports(prev => prev.filter(report => report.id !== reportId));
      onDeleteReport?.(reportId);
    }
  };

  const handleDuplicateReport = (reportId: string) => {
    const reportToDuplicate = reports.find(r => r.id === reportId);
    if (reportToDuplicate) {
      const duplicatedReport: Report = {
        ...reportToDuplicate,
        id: `${reportToDuplicate.id}-copy-${Date.now()}`,
        title: `${reportToDuplicate.title} (Copy)`,
        status: 'draft',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        analytics: {
          views: 0,
          downloads: 0,
          shares: 0,
          avgReadTime: 0,
        },
      };
      setReports(prev => [duplicatedReport, ...prev]);
    }
  };

  const handleExportReport = (reportId: string, format: string) => {
    onExportReport?.(reportId, format);
  };

  const handleShareReport = (reportId: string) => {
    onShareReport?.(reportId);
  };

  if (editingReport) {
    return (
      <ReportEditor
        report={editingReport}
        onSave={handleSaveReport}
        onCancel={() => setEditingReport(null)}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Filter Sidebar */}
      <FilterSidebar
        filters={filters}
        onFiltersChange={setFilters}
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden p-2 rounded-md hover:bg-gray-100"
              >
                <FunnelIcon className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
              <span className="text-sm text-gray-500">
                {filteredReports.length} of {reports.length} reports
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="hidden md:flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                <FunnelIcon className="h-4 w-4" />
                <span>Filters</span>
              </button>
              
              {canCreateReports && (
                <button
                  onClick={onCreateReport}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>New Report</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-500 mb-4">
                {filters.search || filters.status !== 'all' || filters.type !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first report'
                }
              </p>
              {canCreateReports && (
                <button
                  onClick={onCreateReport}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Create Report</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onEdit={canEditReports ? handleEditReport : () => {}}
                  onDelete={canDeleteReports ? handleDeleteReport : () => {}}
                  onExport={handleExportReport}
                  onDuplicate={handleDuplicateReport}
                  onShare={handleShareReport}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ReportManagementInterface;