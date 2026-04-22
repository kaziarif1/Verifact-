import { cn } from '../../utils/cn';
interface AvatarProps { src?:string; name?:string; size?:'xs'|'sm'|'md'|'lg'|'xl'; className?:string }
const sizes = { xs:'w-6 h-6 text-[9px]', sm:'w-8 h-8 text-xs', md:'w-10 h-10 text-sm', lg:'w-14 h-14 text-base', xl:'w-20 h-20 text-xl' };
export const Avatar = ({ src, name='?', size='md', className }: AvatarProps) => {
  const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  return src ? (
    <img src={src} alt={name} className={cn('rounded flex-shrink-0 object-cover', sizes[size], className)} />
  ) : (
    <div className={cn('rounded flex-shrink-0 flex items-center justify-center font-sans font-bold', sizes[size], className)}
      style={{ background:'var(--ink)', color:'var(--paper)' }}>
      {initials}
    </div>
  );
};
