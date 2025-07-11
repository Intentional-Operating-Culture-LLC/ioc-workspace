/**
 * @fileoverview Version management utilities for IOC Core
 * @description Provides version information and utilities for builds and runtime
 */

const fs = require('fs');
const path = require('path');

/**
 * Read version from package.json
 */
function readPackageVersion() {
  try {
    const packagePath = path.resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageJson.version || '1.0.0';
  } catch (error) {
    console.warn('Could not read package.json version:', error.message);
    return '1.0.0';
  }
}

/**
 * Parse semantic version string
 */
function parseSemanticVersion(version) {
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  const match = version.match(semverRegex);
  
  if (!match) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
    build: match[5] || null,
    full: version,
  };
}

/**
 * Get build information from environment
 */
function getBuildInfo() {
  const buildTime = process.env.BUILD_TIMESTAMP || Date.now().toString();
  const buildCommit = process.env.BUILD_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'unknown';
  const buildBranch = process.env.BUILD_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || 'unknown';
  const buildTag = process.env.BUILD_TAG || process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF || '';
  
  return {
    timestamp: buildTime,
    commit: buildCommit.substring(0, 7), // Short commit SHA
    commitFull: buildCommit,
    branch: buildBranch,
    tag: buildTag,
    date: new Date(parseInt(buildTime) || Date.now()).toISOString(),
  };
}

/**
 * Get complete version information
 */
function getVersionInfo() {
  const packageVersion = readPackageVersion();
  const appVersion = process.env.APP_VERSION || process.env.BUILD_VERSION || packageVersion;
  const semanticVersion = parseSemanticVersion(appVersion);
  const buildInfo = getBuildInfo();
  
  return {
    app: appVersion,
    package: packageVersion,
    semantic: semanticVersion,
    build: buildInfo,
    environment: process.env.NODE_ENV || 'development',
    // Convenience properties
    version: appVersion,
    major: semanticVersion.major,
    minor: semanticVersion.minor,
    patch: semanticVersion.patch,
    prerelease: semanticVersion.prerelease,
    buildNumber: semanticVersion.build,
    shortCommit: buildInfo.commit,
    fullCommit: buildInfo.commitFull,
    buildDate: buildInfo.date,
    buildBranch: buildInfo.branch,
  };
}

/**
 * Generate version string for display
 */
function generateVersionString(options = {}) {
  const {
    includeCommit = true,
    includeBranch = false,
    includeDate = false,
    format = 'standard'
  } = options;
  
  const versionInfo = getVersionInfo();
  
  let versionString = versionInfo.version;
  
  if (format === 'full') {
    const parts = [versionString];
    
    if (includeCommit && versionInfo.shortCommit !== 'unknown') {
      parts.push(`+${versionInfo.shortCommit}`);
    }
    
    if (includeBranch && versionInfo.buildBranch !== 'unknown') {
      parts.push(`(${versionInfo.buildBranch})`);
    }
    
    if (includeDate) {
      parts.push(`[${versionInfo.buildDate}]`);
    }
    
    return parts.join(' ');
  } else if (format === 'compact') {
    return includeCommit && versionInfo.shortCommit !== 'unknown' 
      ? `${versionString}+${versionInfo.shortCommit}`
      : versionString;
  }
  
  return versionString;
}

/**
 * Get version environment variables for Next.js
 */
function getVersionEnvironmentVariables() {
  const versionInfo = getVersionInfo();
  
  return {
    // Public variables (available in browser)
    NEXT_PUBLIC_APP_VERSION: versionInfo.app,
    NEXT_PUBLIC_BUILD_VERSION: versionInfo.version,
    NEXT_PUBLIC_BUILD_TIMESTAMP: versionInfo.build.timestamp,
    NEXT_PUBLIC_BUILD_COMMIT: versionInfo.shortCommit,
    NEXT_PUBLIC_BUILD_BRANCH: versionInfo.buildBranch,
    NEXT_PUBLIC_BUILD_DATE: versionInfo.buildDate,
    NEXT_PUBLIC_VERSION_MAJOR: versionInfo.major.toString(),
    NEXT_PUBLIC_VERSION_MINOR: versionInfo.minor.toString(),
    NEXT_PUBLIC_VERSION_PATCH: versionInfo.patch.toString(),
    NEXT_PUBLIC_VERSION_PRERELEASE: versionInfo.prerelease || '',
    NEXT_PUBLIC_VERSION_BUILD: versionInfo.buildNumber || '',
    NEXT_PUBLIC_SEMANTIC_VERSION: versionInfo.semantic.full,
    
    // Server-only variables
    APP_VERSION: versionInfo.app,
    BUILD_VERSION: versionInfo.version,
    BUILD_TIMESTAMP: versionInfo.build.timestamp,
    BUILD_COMMIT_SHA: versionInfo.fullCommit,
    BUILD_BRANCH: versionInfo.buildBranch,
    BUILD_TAG: versionInfo.build.tag,
    SEMANTIC_VERSION: versionInfo.semantic.full,
    VERSION_MAJOR: versionInfo.major.toString(),
    VERSION_MINOR: versionInfo.minor.toString(),
    VERSION_PATCH: versionInfo.patch.toString(),
    VERSION_PRERELEASE: versionInfo.prerelease || '',
    VERSION_BUILD: versionInfo.buildNumber || '',
  };
}

/**
 * Generate build info file content
 */
function generateBuildInfoFile() {
  const versionInfo = getVersionInfo();
  
  return {
    version: versionInfo.version,
    buildInfo: {
      timestamp: versionInfo.build.timestamp,
      date: versionInfo.buildDate,
      commit: versionInfo.fullCommit,
      shortCommit: versionInfo.shortCommit,
      branch: versionInfo.buildBranch,
      tag: versionInfo.build.tag,
      environment: versionInfo.environment,
    },
    semantic: versionInfo.semantic,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Write build info to file
 */
function writeBuildInfoFile(outputPath = './build-info.json') {
  const buildInfo = generateBuildInfoFile();
  
  try {
    fs.writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));
    console.log(`Build info written to ${outputPath}`);
    return true;
  } catch (error) {
    console.error('Failed to write build info file:', error.message);
    return false;
  }
}

/**
 * CLI function to display version info
 */
function displayVersionInfo() {
  const versionInfo = getVersionInfo();
  
  console.log('IOC Core Version Information');
  console.log('============================');
  console.log(`Version: ${versionInfo.version}`);
  console.log(`Package Version: ${versionInfo.package}`);
  console.log(`Semantic Version: ${versionInfo.semantic.full}`);
  console.log(`  - Major: ${versionInfo.major}`);
  console.log(`  - Minor: ${versionInfo.minor}`);
  console.log(`  - Patch: ${versionInfo.patch}`);
  if (versionInfo.prerelease) {
    console.log(`  - Prerelease: ${versionInfo.prerelease}`);
  }
  if (versionInfo.buildNumber) {
    console.log(`  - Build: ${versionInfo.buildNumber}`);
  }
  console.log(`Build Information:`);
  console.log(`  - Commit: ${versionInfo.fullCommit} (${versionInfo.shortCommit})`);
  console.log(`  - Branch: ${versionInfo.buildBranch}`);
  console.log(`  - Date: ${versionInfo.buildDate}`);
  console.log(`  - Environment: ${versionInfo.environment}`);
}

module.exports = {
  readPackageVersion,
  parseSemanticVersion,
  getBuildInfo,
  getVersionInfo,
  generateVersionString,
  getVersionEnvironmentVariables,
  generateBuildInfoFile,
  writeBuildInfoFile,
  displayVersionInfo,
};