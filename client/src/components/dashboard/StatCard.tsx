interface StatCardProps {
  title: string;
  value: number;
  change: number;
  changeText: string;
  isCurrency?: boolean;
  isCount?: boolean;
  changeDirection?: "up" | "down";
  onClick?: () => void;
  isSelected?: boolean;
}

export default function StatCard({
  title,
  value,
  change,
  changeText,
  isCurrency = false,
  isCount = false,
  changeDirection,
  onClick,
  isSelected = false
}: StatCardProps) {
  // Determine if change is positive or negative
  const direction = changeDirection || (change >= 0 ? "up" : "down");
  const absChange = Math.abs(change);
  
  // Format display value
  let displayValue: string;
  if (isCurrency) {
    displayValue = `$${value.toLocaleString()}`;
  } else if (isCount) {
    displayValue = value.toString();
  } else {
    displayValue = value.toString();
  }

  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 p-4 flex flex-col ${onClick ? 'cursor-pointer transition-colors hover:bg-gray-50' : ''} ${isSelected ? 'bg-primary/10' : ''}`}
      onClick={onClick}
    >
      <span className="text-sm font-medium text-gray-500">{title}</span>
      <span className="text-2xl font-bold text-gray-800 mt-1">{displayValue}</span>
      <div className="flex items-center justify-between mt-2 text-xs">
        <div className="flex items-center">
          <span className={`flex items-center ${direction === 'down' ? 'text-green-600' : 'text-red-600'}`}>
            {direction === 'down' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M18 9l-6 6-6-6"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="m6 15 6-6 6 6"/></svg>
            )}
            {isCurrency ? `$${absChange}` : isCount ? absChange : `${absChange}%`}
          </span>
          <span className="text-gray-500 ml-1">{changeText}</span>
        </div>
        {isSelected && (
          <div className="text-primary text-xs font-medium">
            ▼ View details
          </div>
        )}
      </div>
    </div>
  );
}
