import type { DownloadManager } from './download';
import type { UpdateGitOption, UpdateOption, BundleInfo } from './type';

// Re-export types for external use
export type { BundleInfo, UpdateOption, UpdateGitOption } from './type';

export interface GitModule {
  checkForGitUpdate(options: UpdateGitOption): Promise<void>;
  removeGitUpdate(folder?: string): void;
  getBranchName(): Promise<string | null>;
  pullUpdate(options: {
    branch: string;
    folderName?: string;
    onProgress?: (received: number, total: number) => void;
  }): Promise<{ success: boolean; msg?: string }>;
  cloneRepo(options: {
    url: string;
    branch?: string;
    folderName?: string;
    bundlePath: string;
    onProgress?: (received: number, total: number) => void;
  }): Promise<{ success: boolean; bundle?: string; msg?: string }>;
}

export interface OtaHotUpdate {
  /**
   * Set up the path to the downloaded bundle file.
   * @param path - The path to the bundle file.
   * @param extension - Optional extension for the bundle file.
   * @param version - Optional version number to include in folder name.
   */
  setupBundlePath(path: string, extension?: string, version?: number): Promise<boolean>;

  /**
   * Set up an exact path to the bundle file for the update.
   * @param path - The exact path to the bundle file.
   */
  setupExactBundlePath(path: string): Promise<boolean>;

  /**
   * Remove the current update and optionally restart the app.
   * @param restartAfterRemoved - Whether to restart the app after removing the update.
   */
  removeUpdate(restartAfterRemoved?: boolean): void;

  /**
   * Download a bundle file from a specified URI.
   * @param downloadManager - The download manager instance.
   * @param uri - The URI of the bundle file.
   * @param version - The version of the bundle file.
   * @param option - Additional update options.
   */
  downloadBundleUri(
    downloadManager: DownloadManager,
    uri: string,
    version: number,
    option?: UpdateOption
  ): Promise<void>;

  /**
   * Reset the app by restarting it.
   */
  resetApp(): Promise<void>;

  /**
   * Get the current version of the app.
   */
  getCurrentVersion(): Promise<number>;

  /**
   * Set the current version of the app.
   * @param version - The version to set.
   */
  setCurrentVersion(version: number): Promise<boolean>;

  /**
   * Get the list of all bundle versions.
   * @returns Array of bundle information including id, version, date, path, isActive, and metadata.
   */
  getBundleList(): Promise<BundleInfo[]>;

  /**
   * Delete a bundle by its identifier (folder name).
   * @param id - The bundle identifier (folder name).
   * @returns True if the bundle was successfully deleted, false otherwise.
   */
  deleteBundleById(id: string): Promise<boolean>;

  /**
   * Clear all bundles from history.
   * @returns True if all bundles were successfully cleared, false otherwise.
   */
  clearAllBundles(): Promise<boolean>;

  /**
   * Git-related operations.
   */
  git: GitModule;
}

declare const OtaHotUpdate: OtaHotUpdate;

export default OtaHotUpdate;
