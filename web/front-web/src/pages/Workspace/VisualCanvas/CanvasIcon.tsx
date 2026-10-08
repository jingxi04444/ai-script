import type { HTMLAttributes } from 'react';
import { Crosshair } from '@phosphor-icons/react/dist/csr/Crosshair';
import { FlowArrow } from '@phosphor-icons/react/dist/csr/FlowArrow';
import { SquaresFour } from '@phosphor-icons/react/dist/csr/SquaresFour';
import { MapPinArea } from '@phosphor-icons/react/dist/csr/MapPinArea';
import { SidebarSimple } from '@phosphor-icons/react/dist/csr/SidebarSimple';
import { Trash } from '@phosphor-icons/react/dist/csr/Trash';
import { X } from '@phosphor-icons/react/dist/csr/X';
import { CloudCheck } from '@phosphor-icons/react/dist/csr/CloudCheck';
import { Copy } from '@phosphor-icons/react/dist/csr/Copy';
import { ChartLine } from '@phosphor-icons/react/dist/csr/ChartLine';
import { DownloadSimple } from '@phosphor-icons/react/dist/csr/DownloadSimple';
import { Cursor } from '@phosphor-icons/react/dist/csr/Cursor';
import { ImageSquare } from '@phosphor-icons/react/dist/csr/ImageSquare';
import { ClockCounterClockwise } from '@phosphor-icons/react/dist/csr/ClockCounterClockwise';
import { Stack } from '@phosphor-icons/react/dist/csr/Stack';
import { CircleNotch } from '@phosphor-icons/react/dist/csr/CircleNotch';
import { Play } from '@phosphor-icons/react/dist/csr/Play';
import { Plus } from '@phosphor-icons/react/dist/csr/Plus';
import { Question } from '@phosphor-icons/react/dist/csr/Question';
import { ArrowClockwise } from '@phosphor-icons/react/dist/csr/ArrowClockwise';
import { Robot } from '@phosphor-icons/react/dist/csr/Robot';
import { FloppyDisk } from '@phosphor-icons/react/dist/csr/FloppyDisk';
import { PaperPlaneTilt } from '@phosphor-icons/react/dist/csr/PaperPlaneTilt';
import { ShareNetwork } from '@phosphor-icons/react/dist/csr/ShareNetwork';
import { Cube } from '@phosphor-icons/react/dist/csr/Cube';
import { PushPin } from '@phosphor-icons/react/dist/csr/PushPin';
import { Lightning } from '@phosphor-icons/react/dist/csr/Lightning';
import { ArrowCounterClockwise } from '@phosphor-icons/react/dist/csr/ArrowCounterClockwise';
import { VideoCamera } from '@phosphor-icons/react/dist/csr/VideoCamera';
import { Palette } from '@phosphor-icons/react/dist/csr/Palette';
import { Microphone } from '@phosphor-icons/react/dist/csr/Microphone';
import { TextAlignLeft } from '@phosphor-icons/react/dist/csr/TextAlignLeft';
import { NotePencil } from '@phosphor-icons/react/dist/csr/NotePencil';
import { FilmStrip } from '@phosphor-icons/react/dist/csr/FilmStrip';
import { Package } from '@phosphor-icons/react/dist/csr/Package';
import { CaretRight } from '@phosphor-icons/react/dist/csr/CaretRight';
import { Scissors } from '@phosphor-icons/react/dist/csr/Scissors';
import { Waveform } from '@phosphor-icons/react/dist/csr/Waveform';
import { UploadSimple } from '@phosphor-icons/react/dist/csr/UploadSimple';
import { User } from '@phosphor-icons/react/dist/csr/User';
import { PersonSimple } from '@phosphor-icons/react/dist/csr/PersonSimple';
import { Panorama } from '@phosphor-icons/react/dist/csr/Panorama';
import { CopySimple } from '@phosphor-icons/react/dist/csr/CopySimple';
import { Images } from '@phosphor-icons/react/dist/csr/Images';
import { ArrowUp } from '@phosphor-icons/react/dist/csr/ArrowUp';
import { ArrowLeft } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { Camera } from '@phosphor-icons/react/dist/csr/Camera';
import { Check } from '@phosphor-icons/react/dist/csr/Check';
import { CheckCircle } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { CaretDown } from '@phosphor-icons/react/dist/csr/CaretDown';
import { ArrowsOutSimple } from '@phosphor-icons/react/dist/csr/ArrowsOutSimple';
import { WarningCircle } from '@phosphor-icons/react/dist/csr/WarningCircle';
import { SlidersHorizontal } from '@phosphor-icons/react/dist/csr/SlidersHorizontal';
import { ArrowsInSimple } from '@phosphor-icons/react/dist/csr/ArrowsInSimple';
import { Translate } from '@phosphor-icons/react/dist/csr/Translate';
import { Hand } from '@phosphor-icons/react/dist/csr/Hand';
import { Keyboard } from '@phosphor-icons/react/dist/csr/Keyboard';
import { DotsThree } from '@phosphor-icons/react/dist/csr/DotsThree';
import { Rectangle } from '@phosphor-icons/react/dist/csr/Rectangle';
import { Eye } from '@phosphor-icons/react/dist/csr/Eye';
import { EyeSlash } from '@phosphor-icons/react/dist/csr/EyeSlash';
import { Lock } from '@phosphor-icons/react/dist/csr/Lock';
import { LockOpen } from '@phosphor-icons/react/dist/csr/LockOpen';
import { ArrowsClockwise } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { Cylinder } from '@phosphor-icons/react/dist/csr/Cylinder';
import { Sphere } from '@phosphor-icons/react/dist/csr/Sphere';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { Pause } from '@phosphor-icons/react/dist/csr/Pause';
import { SkipBack } from '@phosphor-icons/react/dist/csr/SkipBack';
import { Diamond } from '@phosphor-icons/react/dist/csr/Diamond';
import OpenAIOutlined from '@ant-design/icons/OpenAIOutlined';

const icons = {
  AimOutlined: Crosshair,
  ApartmentOutlined: FlowArrow,
  AppstoreOutlined: SquaresFour,
  ClearOutlined: Trash,
  CloseOutlined: X,
  CloudOutlined: CloudCheck,
  CopyOutlined: Copy,
  DeleteOutlined: Trash,
  DashboardOutlined: ChartLine,
  DownloadOutlined: DownloadSimple,
  CloudDownloadOutlined: DownloadSimple,
  DragOutlined: Cursor,
  EyeOutlined: ImageSquare,
  HistoryOutlined: ClockCounterClockwise,
  LayoutOutlined: Stack,
  LoadingOutlined: CircleNotch,
  NodeIndexOutlined: FlowArrow,
  PictureOutlined: ImageSquare,
  PlayCircleFilled: Play,
  PlusOutlined: Plus,
  QuestionCircleOutlined: Question,
  RedoOutlined: ArrowClockwise,
  RobotOutlined: Robot,
  SaveOutlined: FloppyDisk,
  SendOutlined: PaperPlaneTilt,
  ShareAltOutlined: ShareNetwork,
  ShopOutlined: Cube,
  TagsOutlined: PushPin,
  ThunderboltOutlined: Lightning,
  UndoOutlined: ArrowCounterClockwise,
  VideoCameraOutlined: VideoCamera,
  BgColorsOutlined: Palette,
  AudioOutlined: Microphone,
  ExportOutlined: DownloadSimple,
  FileImageOutlined: ImageSquare,
  FileTextOutlined: TextAlignLeft,
  HighlightOutlined: NotePencil,
  PlaySquareOutlined: FilmStrip,
  ProductOutlined: Package,
  RightOutlined: CaretRight,
  ScissorOutlined: Scissors,
  SoundOutlined: Waveform,
  UploadOutlined: UploadSimple,
  UserOutlined: User,
  DirectorActor: PersonSimple,
  DirectorPanorama: Panorama,
  DirectorFrame: CopySimple,
  DirectorImage: Images,
  ArrowUpOutlined: ArrowUp,
  CameraOutlined: Camera,
  CheckOutlined: Check,
  CheckCircleFilled: CheckCircle,
  DownOutlined: CaretDown,
  ExpandAltOutlined: ArrowsOutSimple,
  ExclamationCircleFilled: WarningCircle,
  PushpinOutlined: PushPin,
  SettingOutlined: SlidersHorizontal,
  ShrinkOutlined: ArrowsInSimple,
  TranslationOutlined: Translate,
  Hand: Hand,
  Keyboard: Keyboard,
  More: DotsThree,
  Cursor: Cursor,
  CaretDown: CaretDown,
  Cube: Cube,
  Arrange: SquaresFour,
  Minimap: MapPinArea,
  Assets: SidebarSimple,
  Text: TextAlignLeft,
  Image: ImageSquare,
  Video: VideoCamera,
  Music: Waveform,
  Edit: Scissors,
  AspectRatio: Rectangle,
  Visibility: Eye,
  EyeInvisibleOutlined: EyeSlash,
  LockOutlined: Lock,
  UnlockOutlined: LockOpen,
  RetweetOutlined: ArrowsClockwise,
  ExpandOutlined: ArrowsOutSimple,
  FullscreenOutlined: ArrowsOutSimple,
  ArrowLeftOutlined: ArrowLeft,
  ArrowRightOutlined: CaretRight,
  Cylinder: Cylinder,
  Sphere: Sphere,
  Search: MagnifyingGlass,
  Pause: Pause,
  SkipBack: SkipBack,
  Diamond: Diamond,
  Note: NotePencil,
};

interface CanvasIconProps extends HTMLAttributes<HTMLSpanElement> {
  name: keyof typeof icons | 'OpenAIOutlined';
  spin?: boolean;
}

/** A single optical size and stroke weight for the canvas and its node editors. */
export default function CanvasIcon({ name, className = '', spin = false, ...props }: CanvasIconProps) {
  const Icon = name === 'OpenAIOutlined' ? null : icons[name];
  return <span {...props} aria-hidden="true" className={`anticon canvas-icon ${spin ? 'canvas-icon-spin' : ''} ${className}`}>
    {Icon ? <Icon size="1em" weight="regular" /> : <OpenAIOutlined />}
  </span>;
}
