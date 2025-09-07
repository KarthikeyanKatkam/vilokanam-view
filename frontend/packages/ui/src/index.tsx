import React from 'react';
import WebRTCBroadcaster from './components/WebRTCBroadcaster';
import WebRTCViewer from './components/WebRTCViewer';
import Logo from './components/Logo';
import './globals.css';

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const baseClasses = "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variantClasses = {
    primary: "bg-[#8b5cf6] text-white hover:bg-[#7c3aed] focus-visible:ring-[#8b5cf6]",
    secondary: "bg-[#0ea5e9] text-white hover:bg-[#0284c7] focus-visible:ring-[#0ea5e9]",
    danger: "bg-[#ef4444] text-white hover:bg-red-700 focus-visible:ring-red-500",
    outline: "border border-[#262626] bg-transparent text-white hover:bg-[#262626] focus-visible:ring-[#8b5cf6]",
    ghost: "bg-transparent text-white hover:bg-[#262626] focus-visible:ring-[#8b5cf6]",
  };
  
  const sizeClasses = {
    sm: "text-xs px-3 py-1.5 rounded-sm",
    md: "text-sm px-4 py-2 rounded-md",
    lg: "text-base px-6 py-3 rounded-lg",
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
    <div className={`rounded-lg border border-[#262626] bg-[#1f1f23] shadow-lg ${className}`} {...props}>
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
    <p className={`text-sm text-[#adadb8] ${className}`} {...props}>
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
    <header className={`bg-[#0e0e10] border-b border-[#262626] ${className}`} {...props}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Logo variant="color" className="mr-2" />
            <h1 className="text-xl font-bold text-white">Vilokanam</h1>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="/" className="text-[#adadb8] hover:text-white transition-colors">Home</a>
            <a href="/streams" className="text-[#adadb8] hover:text-white transition-colors">Streams</a>
            <a href="/categories" className="text-[#adadb8] hover:text-white transition-colors">Categories</a>
          </nav>
          <div className="flex items-center space-x-4">
            <button className="text-[#adadb8] hover:text-white transition-colors">Sign In</button>
            <Button size="sm" variant="outline">Connect Wallet</Button>
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
    <header className={`bg-[#0e0e10] border-b border-[#262626] ${className}`} {...props}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Logo variant="color" className="mr-2" />
            <h1 className="text-xl font-bold text-white">Vilokanam Creator</h1>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="/creator/dashboard" className="text-[#adadb8] hover:text-white transition-colors">Dashboard</a>
            <a href="/creator/analytics" className="text-[#adadb8] hover:text-white transition-colors">Analytics</a>
            <a href="/creator/settings" className="text-[#adadb8] hover:text-white transition-colors">Settings</a>
          </nav>
          <div className="flex items-center space-x-4">
            <button className="text-[#adadb8] hover:text-white transition-colors">Sign Out</button>
            <div className="w-8 h-8 rounded-full bg-[#8b5cf6] flex items-center justify-center text-white">
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
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="relative">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={title} 
            className="w-full h-48 object-cover rounded-t-lg"
          />
        ) : (
          <div className="bg-gradient-to-br from-[#8b5cf6] to-[#0ea5e9] w-full h-48 rounded-t-lg flex items-center justify-center">
            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
          </div>
        )}
        {isLive && (
          <div className="absolute top-2 left-2 bg-[#ef4444] text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
            <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></span>
            LIVE
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          {viewerCount} viewers
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-1 truncate text-white">{title}</h3>
        <p className="text-[#adadb8] text-sm mb-2">{creator}</p>
        <div className="flex justify-between items-center">
          <span className="bg-[#8b5cf6] bg-opacity-20 text-[#c4b5fd] text-xs px-2 py-1 rounded">
            {category}
          </span>
          <span className="text-[#71717a] text-xs">Started 30 min ago</span>
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
    <Card className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <CardContent className="p-6 text-center">
        <div className="bg-gradient-to-br from-[#8b5cf6] to-[#0ea5e9] rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
        </div>
        <h3 className="font-semibold text-lg mb-1 text-white">{name}</h3>
        <p className="text-[#adadb8] text-sm">{streamCount} streams</p>
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
            <p className="text-sm font-medium text-[#adadb8]">{title}</p>
            <h3 className="text-2xl font-bold mt-2 text-white">{value}</h3>
            {change && (
              <p className={`text-sm mt-1 ${isPositive ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {change} from last period
              </p>
            )}
          </div>
          {icon && (
            <div className="p-3 bg-[#8b5cf6] bg-opacity-20 rounded-full text-[#c4b5fd]">
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
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwn ? 'bg-[#8b5cf6] text-white' : 'bg-[#262626] text-white'}`}>
        {!isOwn && <p className="text-xs font-semibold text-[#c4b5fd]">{user}</p>}
        <p className="text-sm">{message}</p>
        <p className={`text-xs mt-1 ${isOwn ? 'text-[#c4b5fd] opacity-80' : 'text-[#71717a]'}`}>{time}</p>
      </div>
    </div>
  );
};

// Export streaming components
export { WebRTCBroadcaster, WebRTCViewer };