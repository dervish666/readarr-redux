// Icon mapping follows Sonarr's icons.ts (commit 76c006b94).
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  Book,
  Bookmark,
  BookmarkX,
  BookOpen,
  Bug,
  Calendar,
  CalendarDays,
  Captions,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleChevronLeft,
  CircleChevronRight,
  CircleChevronUp,
  CircleDot,
  CircleHelp,
  CircleStop,
  CircleX,
  Clock,
  Cloud,
  CloudDownload,
  CloudOff,
  Copy,
  CopyX,
  CornerLeftUp,
  Download,
  EllipsisVertical,
  Equal,
  ExternalLink,
  Eye,
  File,
  FileArchive,
  FileAudio,
  FileDown,
  FileExclamationPoint,
  FileInput,
  FileOutput,
  FileText,
  FileX,
  Flag,
  FlaskConical,
  Folder,
  FolderOpen,
  FolderPen,
  FolderX,
  GitCompareArrows,
  Group,
  Hand,
  HardDrive,
  Heart,
  HeartPulse,
  History,
  Hourglass,
  House,
  Info,
  Keyboard,
  Laptop,
  Layers,
  LayoutGrid,
  LayoutList,
  ListChecks,
  ListFilter,
  Loader,
  Lock,
  LogOut,
  Menu,
  MessageSquareWarning,
  Minus,
  Monitor,
  MoveRight,
  PackageOpen,
  Pause,
  Percent,
  Play,
  Plus,
  Power,
  Radio,
  RefreshCcw,
  RefreshCw,
  Rocket,
  RotateCcw,
  Route,
  Rss,
  Save,
  Search,
  SearchX,
  Settings,
  SquareCheckBig,
  SquarePen,
  Star,
  Table,
  Tags,
  Trash,
  TrendingDown,
  TriangleAlert,
  Ungroup,
  Unplug,
  User,
  UserPlus,
  Users,
  UserX,
  Wrench,
  X,
  ZoomIn
} from 'lucide-react';

export const ACTIONS = EllipsisVertical;
export const ACTIVITY = Clock;
export const ADD = Plus;
export const ADD_MISSING_AUTHORS = ZoomIn;
export const ALTERNATE_TITLES = Captions;
export const ADVANCED_SETTINGS = Settings;
export const ARROW_LEFT = CircleChevronLeft;
export const ARROW_RIGHT = CircleChevronRight;
export const ARROW_RIGHT_NO_CIRCLE = MoveRight;
export const ARROW_UP = CircleChevronUp;
export const AUTHORS = Users;
export const BACKUP = FileArchive;
export const BAN = Ban;
export const BOOK = Book;
export const BUG = Bug;
export const CALENDAR = CalendarDays;
export const CALENDAR_O = Calendar;
export const CARET_DOWN = ChevronDown;
export const CHECK = Check;
export const CHECK_INDETERMINATE = Minus;
export const CHECK_CIRCLE = CircleCheck;
export const CHECK_SQUARE = SquareCheckBig;
export const CIRCLE = Circle;
export const CIRCLE_OUTLINE = Circle;
export const CLEAR = Trash;
export const CLIPBOARD = Copy;
export const CLOSE = X;
export const CLONE = Copy;
export const COLLAPSE = ChevronUp;
export const COMPUTER = Monitor;
export const DANGER = CircleAlert;
export const DELETE = Trash;
export const DOWNLOAD = Download;
export const DOWNLOADED = Download;
export const DOWNLOADING = CloudDownload;
export const DRIVE = HardDrive;
export const EDIT = Wrench;
export const TRACK_FILE = FileAudio;
export const EXPAND = ChevronDown;
export const EXPAND_INDETERMINATE = ChevronRight;
export const EXPORT = FileOutput;
export const EXTERNAL_LINK = ExternalLink;
export const FATAL = CircleX;
export const FILE = File;
export const FILEIMPORT = FileInput;
export const FILTER = ListFilter;
export const FLAG = Flag;
export const FOLDER = Folder;
export const FOLDER_OPEN = FolderOpen;
export const GROUP = Group;
export const HEALTH = HeartPulse;
export const HEART = Heart;
export const HISTORY = History;
export const HOUSEKEEPING = House;
export const IGNORE = CircleX;
export const INFO = Info;
export const INTERACTIVE = User;
export const KEYBOARD = Keyboard;
export const LOGOUT = LogOut;
export const MANAGE = ListChecks;
export const MEDIA_INFO = FileText;
export const MISSING = TriangleAlert;
export const MONITORED = Bookmark;
export const NETWORK = Radio;
export const NAVBAR_COLLAPSE = Menu;
export const NOT_AIRED = Clock;
export const ORGANIZE = FolderPen;
export const OVERFLOW = EllipsisVertical;
export const OVERVIEW = LayoutList;
export const PAGE_FIRST = ChevronsLeft;
export const PAGE_PREVIOUS = ChevronLeft;
export const PAGE_NEXT = ChevronRight;
export const PAGE_LAST = ChevronsRight;
export const PARENT = CornerLeftUp;
export const PAUSED = Pause;
export const PENDING = Clock;
export const PROFILE = User;
export const POSTER = LayoutGrid;
export const QUEUED = Cloud;
export const QUICK = Rocket;
export const REFRESH = RefreshCw;
export const REMOVE = X;
export const REORDER = Menu;
export const RESCAN = FolderOpen;
export const RESTART = RotateCcw;
export const RESTORE = History;
export const RETAG = SquarePen;
export const RSS = Rss;
export const SAVE = Save;
export const SCHEDULED = Clock;
export const SCORE = UserPlus;
export const SEARCH = Search;
export const AUTHOR_CONTINUING = Play;
export const AUTHOR_ENDED = CircleStop;
export const SETTINGS = Settings;
export const SHUTDOWN = Power;
export const SORT = ArrowUpDown;
export const SORT_ASCENDING = ArrowUp;
export const SORT_DESCENDING = ArrowDown;
export const SPINNER = Loader;
export const STAR_FULL = Star;
export const SUBTRACT = Minus;
export const SYSTEM = Laptop;
export const TABLE = Table;
export const TAGS = Tags;
export const TBA = CircleHelp;
export const TEST = FlaskConical;
export const UNGROUP = Ungroup;
export const UNKNOWN = CircleHelp;
export const UNMONITORED = BookmarkX;
export const UPDATE = RefreshCcw;
export const UNSAVED_SETTING = CircleDot;
export const VIEW = Eye;
export const WARNING = TriangleAlert;
export const WIKI = BookOpen;

// Queue status chips and triage actions (Activity/Queue/getQueueStatusChips.ts)
export const QUEUE_ALREADY_IMPORTED = CheckCheck;
export const QUEUE_CLIENT_UNAVAILABLE = Unplug;
export const QUEUE_CLIENT_WARNING = MessageSquareWarning;
export const QUEUE_CLOSE_MATCH = Percent;
export const QUEUE_COMPARE = GitCompareArrows;
export const QUEUE_DESTINATION_EXISTS = FileExclamationPoint;
export const QUEUE_DOWNLOAD_FAILED = CloudOff;
export const QUEUE_IMPORTING = FileDown;
export const QUEUE_LEFT_BEHIND = FileX;
export const QUEUE_MANUAL_IMPORT = Hand;
export const QUEUE_MIXED_BOOKS = Layers;
export const QUEUE_NO_FILES = FolderX;
export const QUEUE_NO_MATCH = SearchX;
export const QUEUE_NOT_AN_UPGRADE = TrendingDown;
export const QUEUE_PART_CLAIMED = CopyX;
export const QUEUE_PATH = Route;
export const QUEUE_PERMISSIONS = Lock;
export const QUEUE_SAME_SIZE = Equal;
export const QUEUE_UNKNOWN_AUTHOR = UserX;
export const QUEUE_UNPACKING = PackageOpen;
export const QUEUE_WAITING_TO_PROCESS = Hourglass;
