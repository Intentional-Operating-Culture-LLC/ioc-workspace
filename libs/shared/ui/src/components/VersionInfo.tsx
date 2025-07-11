/**
 * @fileoverview Version information component
 * @description Displays version and build information for the application
 */

import React from 'react';

interface VersionInfoProps {
  /**
   * Display format for version information
   */
  format?: 'compact' | 'full' | 'detailed';
  
  /**
   * Whether to show build information
   */
  showBuild?: boolean;
  
  /**
   * Whether to show commit information
   */
  showCommit?: boolean;
  
  /**
   * Whether to show environment information
   */
  showEnvironment?: boolean;
  
  /**
   * Custom className for styling
   */
  className?: string;
  
  /**
   * Custom styles
   */
  style?: React.CSSProperties;
  
  /**
   * Override version data (for testing)
   */
  versionData?: {
    version?: string;
    buildDate?: string;
    commit?: string;
    branch?: string;
    environment?: string;
    major?: string;
    minor?: string;
    patch?: string;
    prerelease?: string;
    build?: string;
  };
}

/**
 * Get version information from environment variables
 */
function getVersionInfo() {
  return {
    version: process.env.NEXT_PUBLIC_APP_VERSION || process.env.NEXT_PUBLIC_BUILD_VERSION || '0.1.0',
    buildDate: process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString(),
    buildTimestamp: process.env.NEXT_PUBLIC_BUILD_TIMESTAMP,
    commit: process.env.NEXT_PUBLIC_BUILD_COMMIT || 'unknown',
    branch: process.env.NEXT_PUBLIC_BUILD_BRANCH || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    major: process.env.NEXT_PUBLIC_VERSION_MAJOR || '0',
    minor: process.env.NEXT_PUBLIC_VERSION_MINOR || '1',
    patch: process.env.NEXT_PUBLIC_VERSION_PATCH || '0',
    prerelease: process.env.NEXT_PUBLIC_VERSION_PRERELEASE || '',
    build: process.env.NEXT_PUBLIC_VERSION_BUILD || '',
  };
}

/**
 * Format build date for display
 */
function formatBuildDate(dateString: string | undefined): string {
  if (!dateString) return 'Unknown';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return dateString;
  }
}

/**
 * Version information component
 */
export const VersionInfo: React.FC<VersionInfoProps> = ({
  format = 'compact',
  showBuild = true,
  showCommit = true,
  showEnvironment = false,
  className = '',
  style = {},
  versionData,
}) => {
  const versionInfo = versionData || getVersionInfo();
  
  const renderCompact = () => (
    <span className={`text-sm text-gray-500 ${className}`} style={style}>
      v{versionInfo.version}
      {showCommit && versionInfo.commit !== 'unknown' && (
        <span className="ml-1">+{versionInfo.commit}</span>
      )}
      {showEnvironment && (
        <span className="ml-1 text-xs">({versionInfo.environment})</span>
      )}
    </span>
  );
  
  const renderFull = () => (
    <div className={`text-sm text-gray-600 ${className}`} style={style}>
      <div>Version: {versionInfo.version}</div>
      {showBuild && (
        <div>Built: {formatBuildDate(versionInfo.buildDate)}</div>
      )}
      {showCommit && versionInfo.commit !== 'unknown' && (
        <div>Commit: {versionInfo.commit}</div>
      )}
      {showEnvironment && (
        <div>Environment: {versionInfo.environment}</div>
      )}
    </div>
  );
  
  const renderDetailed = () => (
    <div className={`text-sm text-gray-600 ${className}`} style={style}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-semibold">Version Information</div>
          <div>Version: {versionInfo.version}</div>
          <div>Major: {versionInfo.major || '0'}</div>
          <div>Minor: {versionInfo.minor || '1'}</div>
          <div>Patch: {versionInfo.patch || '0'}</div>
          {versionInfo.prerelease && (
            <div>Prerelease: {versionInfo.prerelease}</div>
          )}
          {versionInfo.build && (
            <div>Build: {versionInfo.build}</div>
          )}
        </div>
        
        <div>
          <div className="font-semibold">Build Information</div>
          {showBuild && (
            <div>Built: {formatBuildDate(versionInfo.buildDate)}</div>
          )}
          {showCommit && versionInfo.commit !== 'unknown' && (
            <div>Commit: {versionInfo.commit}</div>
          )}
          {versionInfo.branch !== 'unknown' && (
            <div>Branch: {versionInfo.branch}</div>
          )}
          {showEnvironment && (
            <div>Environment: {versionInfo.environment}</div>
          )}
        </div>
      </div>
    </div>
  );
  
  switch (format) {
    case 'full':
      return renderFull();
    case 'detailed':
      return renderDetailed();
    case 'compact':
    default:
      return renderCompact();
  }
};

/**
 * Hook to get version information
 */
export function useVersionInfo() {
  const [versionInfo, setVersionInfo] = React.useState(getVersionInfo());
  
  React.useEffect(() => {
    // Update version info if environment variables change
    setVersionInfo(getVersionInfo());
  }, []);
  
  return versionInfo;
}

/**
 * Version badge component for displaying in headers/footers
 */
export const VersionBadge: React.FC<{
  className?: string;
  style?: React.CSSProperties;
}> = ({ className = '', style = {} }) => {
  const versionInfo = useVersionInfo();
  
  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${className}`}
      style={style}
      title={`Version ${versionInfo.version} - Built ${formatBuildDate(versionInfo.buildDate)}`}
    >
      v{versionInfo.version}
    </span>
  );
};

/**
 * Build info component for admin/debug purposes
 */
export const BuildInfo: React.FC<{
  className?: string;
  style?: React.CSSProperties;
}> = ({ className = '', style = {} }) => {
  const versionInfo = useVersionInfo();
  
  return (
    <div className={`text-xs text-gray-500 font-mono ${className}`} style={style}>
      <div>Build: {formatBuildDate(versionInfo.buildDate)}</div>
      <div>Commit: {versionInfo.commit}</div>
      <div>Branch: {versionInfo.branch}</div>
      <div>Environment: {versionInfo.environment}</div>
    </div>
  );
};

export default VersionInfo;