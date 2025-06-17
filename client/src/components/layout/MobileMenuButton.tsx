import { Menu } from 'lucide-react';

interface MobileMenuButtonProps {
  onClick: () => void;
}

export default function MobileMenuButton({ onClick }: MobileMenuButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center justify-center w-12 h-12 text-white bg-[#161b2b] hover:bg-blue-800/50 rounded-md z-50 touch-manipulation"
      aria-label="Open menu"
      type="button"
    >
      <Menu size={28} strokeWidth={2.5} />
    </button>
  );
}