import React from 'react';
import WebRTCBroadcaster from './components/WebRTCBroadcaster';
import WebRTCViewer from './components/WebRTCViewer';

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-gray-300 bg-white hover:bg-gray-50",
  };
  
  const sizeClasses = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-6 py-3",
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export const Card = ({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`rounded-lg border bg-white shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription = ({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <p className={`text-sm text-gray-500 ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent = ({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter = ({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`flex items-center p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const Header = ({
  className = '',
  ...props
}: {
  className?: string;
}) => {
  return (
    <header className={`bg-white border-b shadow-sm ${className}`} {...props}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-blue-600">Vilokanam</h1>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="/" className="text-gray-700 hover:text-blue-600">Home</a>
            <a href="/streams" className="text-gray-700 hover:text-blue-600">Streams</a>
            <a href="/categories" className="text-gray-700 hover:text-blue-600">Categories</a>
          </nav>
          <div className="flex items-center space-x-4">
            <button className="text-gray-700 hover:text-blue-600">Sign In</button>
            <Button size="sm">Connect Wallet</Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export const CreatorHeader = ({
  className = '',
  ...props
}: {
  className?: string;
}) => {
  return (
    <header className={`bg-white border-b shadow-sm ${className}`} {...props}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-blue-600">Vilokanam Creator</h1>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="/creator/dashboard" className="text-gray-700 hover:text-blue-600">Dashboard</a>
            <a href="/creator/analytics" className="text-gray-700 hover:text-blue-600">Analytics</a>
            <a href="/creator/settings" className="text-gray-700 hover:text-blue-600">Settings</a>
          </nav>
          <div className="flex items-center space-x-4">
            <button className="text-gray-700 hover:text-blue-600">Sign Out</button>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
              C
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export const StreamCard = ({
  title,
  creator,
  viewerCount,
  category,
  thumbnail,
  isLive = false,
  ...props
}: {
  title: string;
  creator: string;
  viewerCount: number;
  category: string;
  thumbnail?: string;
  isLive?: boolean;
  className?: string;
}) => {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={title} 
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-48" />
        )}
        {isLive && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
            LIVE
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          {viewerCount} viewers
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-1 truncate">{title}</h3>
        <p className="text-gray-600 text-sm mb-2">{creator}</p>
        <div className="flex justify-between items-center">
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
            {category}
          </span>
          <span className="text-gray-500 text-xs">Started 30 min ago</span>
        </div>
      </CardContent>
    </Card>
  );
};

export const CategoryCard = ({
  name,
  streamCount,
  ...props
}: {
  name: string;
  streamCount: number;
  className?: string;
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6 text-center">
        <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-1">{name}</h3>
        <p className="text-gray-600 text-sm">{streamCount} streams</p>
      </CardContent>
    </Card>
  );
};

export const StatCard = ({
  title,
  value,
  change,
  icon,
  ...props
}: {
  title: string;
  value: string;
  change?: string;
  icon?: React.ReactNode;
  className?: string;
}) => {
  const isPositive = change && !change.startsWith('-');
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <h3 className="text-2xl font-bold mt-2">{value}</h3>
            {change && (
              <p className={`text-sm mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {change} from last period
              </p>
            )}
          </div>
          {icon && (
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const ChatMessage = ({
  user,
  message,
  time,
  isOwn = false,
  ...props
}: {
  user: string;
  message: string;
  time: string;
  isOwn?: boolean;
  className?: string;
}) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`} {...props}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
        {!isOwn && <p className="text-xs font-semibold">{user}</p>}
        <p className="text-sm">{message}</p>
        <p className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>{time}</p>
      </div>
    </div>
  );
};

// Export streaming components
export { WebRTCBroadcaster, WebRTCViewer };