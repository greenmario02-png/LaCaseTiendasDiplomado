import { SvgIconComponent } from '@mui/icons-material';
import ComputerIcon from '@mui/icons-material/Computer';
import DevicesIcon from '@mui/icons-material/Devices';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import KitchenIcon from '@mui/icons-material/Kitchen';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import ToysIcon from '@mui/icons-material/Toys';
import ChairIcon from '@mui/icons-material/Chair';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import PetsIcon from '@mui/icons-material/Pets';
import SpaIcon from '@mui/icons-material/Spa';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import WatchIcon from '@mui/icons-material/Watch';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import HomeIcon from '@mui/icons-material/Home';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import BuildIcon from '@mui/icons-material/Build';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import DiamondIcon from '@mui/icons-material/Diamond';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import BrushIcon from '@mui/icons-material/Brush';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import ChildCareIcon from '@mui/icons-material/ChildCare';

export interface CategoryIcon {
  name: string;
  label: string;
  component: SvgIconComponent;
}

/**
 * Catálogo de íconos disponibles para las categorías.
 * El valor guardado es el `name` (p.ej. 'Computer'); el componente
 * se resuelve en render por el nombre.
 */
export const CATEGORY_ICONS: CategoryIcon[] = [
  { name: 'Computer', label: 'Computación', component: ComputerIcon },
  { name: 'Devices', label: 'Dispositivos', component: DevicesIcon },
  { name: 'Smartphone', label: 'Celulares', component: SmartphoneIcon },
  { name: 'Kitchen', label: 'Electrodomésticos', component: KitchenIcon },
  { name: 'Checkroom', label: 'Ropa', component: CheckroomIcon },
  { name: 'SportsSoccer', label: 'Deportes', component: SportsSoccerIcon },
  { name: 'Toys', label: 'Juguetes', component: ToysIcon },
  { name: 'Chair', label: 'Hogar y muebles', component: ChairIcon },
  { name: 'LocalBar', label: 'Bar y bebidas', component: LocalBarIcon },
  { name: 'Restaurant', label: 'Gastronomía', component: RestaurantIcon },
  { name: 'Pets', label: 'Mascotas', component: PetsIcon },
  { name: 'Spa', label: 'Belleza', component: SpaIcon },
  { name: 'MenuBook', label: 'Libros', component: MenuBookIcon },
  { name: 'Watch', label: 'Relojes', component: WatchIcon },
  { name: 'CameraAlt', label: 'Cámaras', component: CameraAltIcon },
  { name: 'MusicNote', label: 'Música', component: MusicNoteIcon },
  { name: 'Home', label: 'Hogar', component: HomeIcon },
  { name: 'ShoppingBag', label: 'Compras', component: ShoppingBagIcon },
  { name: 'Build', label: 'Herramientas', component: BuildIcon },
  { name: 'Memory', label: 'Memoria/RAM', component: MemoryIcon },
  { name: 'Storage', label: 'Almacenamiento', component: StorageIcon },
  { name: 'SportsEsports', label: 'Videojuegos', component: SportsEsportsIcon },
  { name: 'HealthAndSafety', label: 'Salud', component: HealthAndSafetyIcon },
  { name: 'Diamond', label: 'Joyas', component: DiamondIcon },
  { name: 'LocalShipping', label: 'Envíos', component: LocalShippingIcon },
  { name: 'CardGiftcard', label: 'Regalos', component: CardGiftcardIcon },
  { name: 'Brush', label: 'Arte', component: BrushIcon },
  { name: 'FitnessCenter', label: 'Fitness', component: FitnessCenterIcon },
  { name: 'ChildCare', label: 'Infancia', component: ChildCareIcon },
];

const iconMap: Record<string, SvgIconComponent> = Object.fromEntries(CATEGORY_ICONS.map((i) => [i.name, i.component]));

export function getCategoryIcon(name?: string | null): SvgIconComponent | null {
  if (!name) return null;
  return iconMap[name] ?? null;
}

export function isIconSvg(value: string): boolean {
  return value.startsWith('<svg') || value.startsWith('data:image/svg+xml');
}
