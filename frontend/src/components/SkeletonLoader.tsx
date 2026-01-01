interface SkeletonLoaderProps {
  className?: string;
  width?: string;
  height?: string;
}

export default function SkeletonLoader({ className = '', width = '100%', height = '20px' }: SkeletonLoaderProps) {
  return (
    <div 
      className={`skeleton rounded ${className}`}
      style={{ width, height }}
    />
  );
}

export function CoinWidgetSkeleton() {
  return (
    <div className="bg-upbit-bg-card border border-upbit-border rounded-lg p-4 min-w-[200px]">
      <div className="flex items-center gap-3 mb-3">
        <SkeletonLoader width="40px" height="40px" className="rounded-full" />
        <div>
          <SkeletonLoader width="80px" height="16px" className="mb-1" />
          <SkeletonLoader width="60px" height="12px" />
        </div>
      </div>
      <SkeletonLoader width="120px" height="28px" className="mb-2" />
      <SkeletonLoader width="80px" height="16px" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-upbit-bg-card border border-upbit-border rounded-lg p-4 h-[400px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <SkeletonLoader width="150px" height="24px" />
        <SkeletonLoader width="100px" height="20px" />
      </div>
      <div className="flex-1 flex items-end gap-1">
        {[...Array(30)].map((_, i) => (
          <div 
            key={i} 
            className="skeleton flex-1 rounded-t"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}
